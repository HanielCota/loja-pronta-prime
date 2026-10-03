import { useEffect, useRef, type RefObject } from 'react';
import { BOUNCE, JUMP, NOD, PRESS, SHAKE, blinkMotion } from './body-motions';
import { onMascotSignal, type MascotSignal } from './events';
import { EXPRESSIONS, toFaceState, type Expression, type FaceState } from './face';
import { createFaceRenderer } from './face-renderer';
import { IDLE, focusedPasswordField, gazeFor, type Gaze } from './gaze';
import { createReasons, type Reason } from './reasons';
import { springStep } from './spring';

/** Molas criticamente amortecidas (sem quique); "response" em segundos, como na Apple. */
const GAZE_RESPONSE = 0.2;
const FACE_RESPONSE = 0.32;
/** Pálpebras lentas ao adormecer e ao acordar. */
const SLOW_LID_RESPONSE = 1.1;
const SLOW_LIDS_MS = 2_600;

/** Quanto tempo ele olha pra algo que pediu atenção (ex.: o alerta de erro). */
const ATTENTION_MS = 1500;
/** Fica com a cara do erro até a pessoa voltar a digitar (ou até passar esse tempo). */
const UPSET_MS = 4000;
const HAPPY_AFTER_TYPING_MS = 2000;
const CELEBRATE_MS = 1600;
const TAP_MS = 1200;
/** Ao acordar, fica sonolento um tempo enquanto os olhos abrem devagar. */
const WAKING_MS = 1000;
/** Sem nenhuma interação: fica com sono aos 7s e dorme aos 10s. */
const SLEEPY_AFTER_MS = 7_000;
const ASLEEP_AFTER_SLEEPY_MS = 3_000;
/** Intervalo mínimo entre "zerar o relógio do sono" (o mouse dispara dezenas de eventos por segundo). */
const IDLE_RESET_THROTTLE_MS = 500;

/**
 * O comportamento do mascote: junta o que acontece na tela (mouse, foco, digitação, avisos do
 * sistema) numa expressão e num olhar, e anima o rosto até eles com molas.
 *
 * - Expressão: motivos com prazo e prioridade (reasons.ts).
 * - Olhar: geometria da tela (gaze.ts).
 * - Desenho: escrito direto no DOM a cada quadro (face-renderer.ts).
 */
export function useMascot(
  rootRef: RefObject<HTMLDivElement | null>,
  faceRef: RefObject<HTMLDivElement | null>,
  baseExpression: Expression,
) {
  // Lida por referência: mudar a expressão de repouso não desmonta tudo (sono, erro, olhar);
  // só pede um recálculo.
  const baseRef = useRef(baseExpression);
  const updateRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    baseRef.current = baseExpression;
    updateRef.current?.();
  }, [baseExpression]);

  useEffect(() => {
    const root = rootRef.current;
    const face = faceRef.current;
    const renderer = face && createFaceRenderer(face);
    if (!root || !face || !renderer) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reasons = createReasons();

    let pointer: { x: number; y: number } | null = null;
    let attention: { element: Element; until: number } | null = null;
    let current: Expression = baseRef.current;
    let gazeTarget: Gaze = IDLE;
    let faceTarget: FaceState = toFaceState(EXPRESSIONS[baseRef.current]);
    const gaze: Gaze = { ...IDLE };
    const gazeVelocity: Gaze = { x: 0, y: 0 };
    const faceState: FaceState = { ...faceTarget };
    const faceVelocity = Object.fromEntries(
      Object.keys(faceState).map((key) => [key, 0]),
    ) as FaceState;
    let frame = 0;
    let lastTime = 0;
    let blinkTimer = 0;
    let attentionTimer = 0;
    let reasonTimer = 0;
    let idleTimer = 0;
    let pressAnimation: Animation | undefined;
    /** Toque em andamento (separado da animação: com movimento reduzido não há animação). */
    let pressed = false;
    /** Atualização agendada pro próximo quadro (vários eventos no mesmo quadro viram uma). */
    let queuedUpdate = 0;
    let lastIdleReset = 0;
    /** Até quando as pálpebras se movem devagar (adormecendo ou acordando). */
    let slowLidsUntil = 0;
    /** Depois de desmontado, atualizações atrasadas (timers) não fazem mais nada. */
    let disposed = false;
    let onScreen = true;

    // ---------- Expressão e olhar ----------

    function setReason(reason: Reason, expression: Expression, durationMs?: number) {
      reasons.set(reason, expression, durationMs);
      update();
    }

    function clearReason(reason: Reason) {
      if (reasons.delete(reason)) update();
    }

    /** Senha escondida: olhos fechados. Mostrando: espia com um olho só (mas não dormindo). */
    function eyeOverride(): readonly [number, number] | undefined {
      const field = focusedPasswordField();
      if (!field || current === 'asleep') return undefined;
      return field.type === 'password' ? [1, 1] : [1, 0];
    }

    function currentAttention() {
      return attention && performance.now() < attention.until ? attention.element : undefined;
    }

    /** Agenda uma reavaliação pro próximo motivo que vai vencer. */
    function scheduleReasonExpiry() {
      window.clearTimeout(reasonTimer);
      const next = reasons.nextExpiry();
      if (Number.isFinite(next)) {
        reasonTimer = window.setTimeout(update, Math.max(0, next - performance.now()) + 16);
      }
    }

    // ---------- Animação ----------

    function step(time: number) {
      // O horário do rAF é o do início do quadro e pode vir antes do lastTime: nunca negativo.
      const dt = Math.min(Math.max(0, (time - lastTime) / 1000), 1 / 30);
      lastTime = time;
      const gazeSettled = springStep(gaze, gazeVelocity, gazeTarget, GAZE_RESPONSE, dt);
      const slowLids = performance.now() < slowLidsUntil;
      const faceSettled = springStep(
        faceState,
        faceVelocity,
        faceTarget,
        (key) => (slowLids && key.startsWith('lid') ? SLOW_LID_RESPONSE : FACE_RESPONSE),
        dt,
      );
      renderer!.render(gaze, faceState);
      frame = gazeSettled && faceSettled ? 0 : requestAnimationFrame(step);
    }

    /** Recalcula expressão e olhar e anima até eles (ou pula direto, com movimento reduzido). */
    function update() {
      if (disposed) return;
      current = reasons.current(baseRef.current);
      root!.dataset.expression = current;
      scheduleReasonExpiry();
      gazeTarget = gazeFor(face!, currentAttention(), pointer);
      faceTarget = toFaceState(EXPRESSIONS[current], eyeOverride());

      if (reducedMotion.matches) {
        Object.assign(gaze, gazeTarget);
        Object.assign(faceState, faceTarget);
        Object.assign(gazeVelocity, { x: 0, y: 0 });
        for (const key of Object.keys(faceVelocity) as Array<keyof FaceState>)
          faceVelocity[key] = 0;
        renderer!.render(gaze, faceState);
        return;
      }
      if (!frame) {
        lastTime = performance.now();
        frame = requestAnimationFrame(step);
      }
    }

    /**
     * Pra eventos frequentes (mouse, seleção, rolagem): recalcula uma vez por quadro, em vez de
     * medir a tela a cada evento.
     */
    function requestUpdate() {
      // Fora da tela (rolou a página): não mede nem anima a cada movimento do mouse. O ponteiro
      // continua sendo guardado, e o olhar se acerta ao voltar a aparecer.
      if (disposed || queuedUpdate || !onScreen) return;
      queuedUpdate = requestAnimationFrame(() => {
        queuedUpdate = 0;
        update();
      });
    }

    /** Movimento do corpo inteiro; desligado com movimento reduzido. */
    function move({
      keyframes,
      options,
    }: {
      keyframes: Keyframe[];
      options: KeyframeAnimationOptions;
    }) {
      return reducedMotion.matches ? undefined : root!.animate(keyframes, options);
    }

    function blink() {
      if (!reducedMotion.matches && !document.hidden && current !== 'asleep' && !eyeOverride()) {
        const twice = Math.random() < 0.2;
        renderer!.lids.forEach((lid, index) => {
          const { keyframes, options } = blinkMotion(
            index === 0 ? faceState.lid0 : faceState.lid1,
            twice,
          );
          lid.animate(keyframes, options);
        });
      }
      blinkTimer = window.setTimeout(blink, 2500 + Math.random() * 3500);
    }

    // ---------- Avisos do sistema (events.ts) ----------

    function lookAtFor(element: Element) {
      attention = { element, until: performance.now() + ATTENTION_MS };
      window.clearTimeout(attentionTimer);
      attentionTimer = window.setTimeout(() => {
        attention = null;
        update();
      }, ATTENTION_MS + 16);
    }

    function onSignal(signal: MascotSignal) {
      switch (signal.type) {
        case 'celebrate':
          reasons.delete('error');
          setReason('celebrate', 'celebrate', CELEBRATE_MS);
          move(JUMP);
          break;
        case 'upset':
          if (signal.target) lookAtFor(signal.target);
          setReason('error', signal.mood, UPSET_MS);
          if (signal.mood === 'grumpy') move(SHAKE);
          break;
        case 'doubt':
          if (signal.active) setReason('doubt', 'skeptical');
          else clearReason('doubt');
          break;
        case 'nod':
          move(NOD);
          break;
      }
    }

    // ---------- Sono ----------

    function resetIdleTimer() {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        slowLidsUntil = performance.now() + SLOW_LIDS_MS;
        setReason('sleep', 'sleepy');
        idleTimer = window.setTimeout(() => {
          slowLidsUntil = performance.now() + SLOW_LIDS_MS;
          setReason('sleep', 'asleep');
        }, ASLEEP_AFTER_SLEEPY_MS);
      }, SLEEPY_AFTER_MS);
    }

    /** Qualquer interação acorda (abrindo os olhos devagar) e zera o relógio do sono. */
    function onActivity() {
      if (reasons.delete('sleep')) {
        slowLidsUntil = performance.now() + SLOW_LIDS_MS;
        setReason('wake', 'sleepy', WAKING_MS);
      }
      const now = performance.now();
      if (now - lastIdleReset < IDLE_RESET_THROTTLE_MS) return;
      lastIdleReset = now;
      resetIdleTimer();
    }

    // ---------- Eventos da página ----------

    const onPointerMove = (event: PointerEvent) => {
      onActivity();
      if (event.pointerType !== 'mouse') return;
      pointer = { x: event.clientX, y: event.clientY };
      requestUpdate();
    };
    // Rolar muda a posição de tudo na tela: o olhar precisa acompanhar.
    const onScroll = () => {
      onActivity();
      requestUpdate();
    };
    // O foco só muda depois do focusout; espera o próximo ciclo pra ler o elemento ativo.
    const onFocusChange = (event: FocusEvent) => {
      onActivity();
      if (event.type === 'focusout') clearReason('capsLock');
      requestUpdate();
    };
    const onInput = (event: Event) => {
      onActivity();
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
        return update();
      }
      // Digitando: fica feliz e "perdoa" o erro anterior.
      reasons.delete('error');
      setReason('typing', 'happy', HAPPY_AFTER_TYPING_MS);
    };
    const onKey = (event: Event) => {
      onActivity();
      // O preenchimento automático do navegador dispara "keydown"/"keyup" que não são eventos
      // de teclado de verdade (sem getModifierState): esses não dizem nada sobre o Caps Lock.
      if (!(event instanceof KeyboardEvent) || !(event.target instanceof HTMLInputElement)) return;
      // Caps Lock ligado num campo: olhos arregalados, reforçando o aviso da tela.
      if (event.getModifierState('CapsLock')) setReason('capsLock', 'surprised');
      else clearReason('capsLock');
    };

    // Tocar no mascote: encolhe no toque e ri ao soltar em cima dele (arrastar pra fora desfaz).
    const onPress = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      pressAnimation?.cancel();
      pressed = true;
      pressAnimation = move(PRESS);
    };
    const onCancelPress = () => {
      pressed = false;
      pressAnimation?.cancel();
      pressAnimation = undefined;
    };
    const onRelease = () => {
      if (!pressed) return;
      onCancelPress();
      setReason('tap', 'happy', TAP_MS);
      move(BOUNCE);
    };

    // O campo de senha troca de tipo ao "Mostrar senha": os olhos precisam acompanhar.
    const typeObserver = new MutationObserver(requestUpdate);
    typeObserver.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['type'],
    });

    const stopSignals = onMascotSignal(onSignal);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onActivity, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', requestUpdate);
    document.addEventListener('focusin', onFocusChange);
    document.addEventListener('focusout', onFocusChange);
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onKey);
    document.addEventListener('selectionchange', requestUpdate);
    root.addEventListener('pointerdown', onPress);
    root.addEventListener('pointerup', onRelease);
    root.addEventListener('pointerleave', onCancelPress);
    root.addEventListener('pointercancel', onCancelPress);
    blinkTimer = window.setTimeout(blink, 2000);
    resetIdleTimer();
    update();
    updateRef.current = update;

    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? true;
      if (onScreen) update();
    });
    visibility.observe(root);

    return () => {
      disposed = true;
      updateRef.current = undefined;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(queuedUpdate);
      for (const timer of [blinkTimer, attentionTimer, reasonTimer, idleTimer]) {
        window.clearTimeout(timer);
      }
      typeObserver.disconnect();
      visibility.disconnect();
      stopSignals();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', requestUpdate);
      document.removeEventListener('focusin', onFocusChange);
      document.removeEventListener('focusout', onFocusChange);
      document.removeEventListener('input', onInput);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keyup', onKey);
      document.removeEventListener('selectionchange', requestUpdate);
      root.removeEventListener('pointerdown', onPress);
      root.removeEventListener('pointerup', onRelease);
      root.removeEventListener('pointerleave', onCancelPress);
      root.removeEventListener('pointercancel', onCancelPress);
    };
  }, [rootRef, faceRef]);
}
