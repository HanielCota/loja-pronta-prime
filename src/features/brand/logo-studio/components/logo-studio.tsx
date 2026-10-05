'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import type { LogoPicks } from '../model';
import {
  firstOpenStep,
  isComplete,
  missingStudioSteps,
  STUDIO_STEPS,
  studioSteps,
  type StudioStep,
  type StudioSuggestions,
} from '../picks';
import {
  chooseLogo,
  createLogo,
  saveStudioPicks,
  tweakLogo,
  uploadLogo,
  type StudioResult as ActionResult,
} from '../server/actions';
import type { LogoTweak } from '../tweaks';
import type { StudioView } from '../view';
import { ChoiceStep } from './choice-step';
import { CreatingProgress } from './creating-progress';
import { DraftFonts, DraftLogo } from './draft-logo';
import { logoSrc } from './logo-src';
import { shrinkImage } from './shrink-image';
import { StepRail } from './step-rail';
import { StudioBoard } from './studio-board';
import { StudioResult } from './studio-result';
import { StudioReview } from './studio-review';

/** O que está no painel ao lado do quadro: uma escolha, o resumo, a criação ou o logo pronto. */
type Screen =
  | { kind: 'step'; step: StudioStep }
  | { kind: 'review' }
  | { kind: 'creating' }
  | { kind: 'result' };

/** O que está acontecendo agora (trava os botões). */
type Busy = 'creating' | 'uploading' | 'choosing' | null;

/** Onde o estúdio abre: no logo pronto, no resumo ou na primeira escolha que falta. */
function openingScreen(studio: StudioView, renamed: boolean): Screen {
  if (renamed && isComplete(studio.picks)) return { kind: 'review' };
  if (studio.logos.length && !renamed) return { kind: 'result' };
  const open = firstOpenStep(studio.picks);
  return open ? { kind: 'step', step: open } : { kind: 'review' };
}

/**
 * O estúdio do logo, uma escolha por vez, vendo: o quadro mostra o rascunho do logo, que muda a
 * cada toque, e cada opção já é o logo com ela. Escolhido tudo, o resumo e "Criar meu logo"; a IA
 * desenha a versão final, que aparece no quadro com as prévias na loja, os ajustes de um toque e
 * "Usar o logo". Este componente guarda o estado e junta as partes (cada uma no seu arquivo).
 */
export function LogoStudio({
  initial,
  suggestions,
  storeName,
  oldName,
  editing,
  titleId,
}: {
  initial: StudioView;
  suggestions: StudioSuggestions;
  storeName: string;
  /** Ela acabou de mudar o nome da loja (o logo de agora ainda mostra este). */
  oldName: string | undefined;
  editing: boolean;
  /** O id do título (o foco vai pra ele ao chegar e a cada tela nova). */
  titleId: string;
}) {
  const [studio, setStudio] = useState(initial);
  const [picks, setPicks] = useState<LogoPicks>(initial.picks);
  const [screen, setScreen] = useState<Screen>(() => openingScreen(initial, Boolean(oldName)));
  /** A opção sob o mouse: o quadro mostra como fica, sem escolher. */
  const [peek, setPeek] = useState<LogoPicks | null>(null);
  /** O logo que ela tocou pra ver (chegando um novo, ele vale). */
  const [selectedId, setSelectedId] = useState<string>();
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string>();
  const [announcement, setAnnouncement] = useState('');
  const [, startTransition] = useTransition();
  const router = useRouter();
  const errorId = useId();
  const focusTitle = useRef(false);
  /**
   * Guardando as escolhas: o Next roda uma action por vez, então vai uma de cada vez, e a próxima
   * leva sempre as escolhas mais novas (sem fila de versões velhas atrasando a última).
   */
  const saving = useRef<{ busy: boolean; next: LogoPicks | null }>({ busy: false, next: null });

  // Tela nova: o foco vai pro título dela (o leitor de tela lê a pergunta da vez).
  useEffect(() => {
    if (!focusTitle.current) return;
    focusTitle.current = false;
    document.getElementById(titleId)?.focus();
  });

  // Criando o logo (até 1 minuto): sair da página pede confirmação do navegador.
  useEffect(() => {
    if (busy !== 'creating') return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [busy]);

  function go(next: Screen) {
    focusTitle.current = true;
    setError(undefined);
    setPeek(null);
    setScreen(next);
  }

  const steps = studioSteps(picks);
  const logos = studio.logos;
  const selected = logos.find((logo) => logo.imageId === selectedId) ?? logos.at(-1) ?? null;

  /**
   * Roda uma action; chegando logo novo, ele fica selecionado e a tela vai pro logo pronto. Sem
   * logo novo, o aviso aparece; `back`: a tela pra onde voltar (a criação some quando falha).
   */
  function run(kind: Exclude<Busy, null>, action: () => Promise<ActionResult>, back?: Screen) {
    setBusy(kind);
    setError(undefined);
    startTransition(async () => {
      let navigating = false;
      try {
        const result = await action();
        const added = result.studio.logos.length > studio.logos.length;
        setStudio(result.studio);
        if (result.next) {
          // Mudando de página: os botões continuam travados até a outra tela abrir.
          navigating = true;
          router.push(result.next);
          return;
        }
        if (added) {
          setSelectedId(result.studio.logos.at(-1)?.imageId);
          go({ kind: 'result' });
          setAnnouncement(`Logo ${result.studio.logos.length} pronto.`);
        } else {
          if (back) go(back);
          setError(result.error);
        }
      } catch {
        if (back) go(back);
        setError('Algo deu errado. Confira a internet e tente de novo.');
      } finally {
        if (!navigating) setBusy(null);
      }
    });
  }

  function pick(change: LogoPicks, label: string) {
    setPicks((current) => ({ ...current, ...change }));
    setError(undefined);
    if (screen.kind === 'step') {
      setAnnouncement(`${STUDIO_STEPS[screen.step].label}: ${label}. O rascunho mudou.`);
    }
  }

  function save(next: LogoPicks) {
    if (saving.current.busy) {
      saving.current.next = next;
      return;
    }
    saving.current.busy = true;
    saveStudioPicks(next)
      .catch(() => {})
      .finally(() => {
        saving.current.busy = false;
        const queued = saving.current.next;
        saving.current.next = null;
        if (queued) save(queued);
      });
  }

  function goOn(step: StudioStep) {
    if (!picks[step]) {
      setError('Toque numa opção pra continuar.');
      return;
    }
    const after = steps[steps.indexOf(step) + 1];
    if (!after) {
      const missing = missingStudioSteps(picks);
      if (missing.length) {
        const labels = missing.map((missingStep) => STUDIO_STEPS[missingStep].label).join(', ');
        go({ kind: 'step', step: missing[0]! });
        setError(`Falta escolher: ${labels}. Complete essas etapas antes de criar o logo.`);
        return;
      }
    }
    // Guarda sem esperar: ela sai e volta de onde parou (criar o logo guarda de novo).
    save(picks);
    go(after ? { kind: 'step', step: after } : { kind: 'review' });
  }

  function create() {
    const missing = missingStudioSteps(picks);
    if (missing.length) {
      const labels = missing.map((step) => STUDIO_STEPS[step].label).join(', ');
      go({ kind: 'step', step: missing[0]! });
      setError(`Falta escolher: ${labels}. Complete essas etapas antes de criar o logo.`);
      return;
    }
    go({ kind: 'creating' });
    run('creating', () => createLogo(picks), { kind: 'review' });
  }

  function tweak(change: LogoTweak) {
    if (!selected) return;
    go({ kind: 'creating' });
    run('creating', () => tweakLogo(selected.imageId, change), { kind: 'result' });
  }

  function upload(file: File) {
    run('uploading', async () => {
      const image = await shrinkImage(file);
      if (!image) {
        return {
          studio,
          error: 'Não consegui abrir essa imagem. Mande uma foto ou imagem (PNG ou JPG).',
        };
      }
      const form = new FormData();
      form.set('logo', image, 'logo');
      return uploadLogo(form);
    });
  }

  const rail = (current: StudioStep | null) => (
    <StepRail
      steps={steps}
      current={current}
      picks={picks}
      disabled={Boolean(busy)}
      onJump={(step) => go({ kind: 'step', step })}
    />
  );

  const showResult = screen.kind === 'result' && selected;
  const draftPicks = peek ? { ...picks, ...peek } : picks;

  return (
    <div className="mx-auto grid w-full gap-6 pt-2 pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-10">
      <DraftFonts />
      {showResult ? (
        <StudioBoard
          tag={`Logo ${selected.number}`}
          caption={
            selected.uploaded ? 'O logo que você mandou' : 'Feito pela IA com as suas escolhas'
          }
          sticky={false}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={selected.imageId}
            src={logoSrc(selected.imageId)}
            alt={`Logo ${selected.number} criado pra sua loja`}
            width={480}
            height={480}
            className="size-full bg-card object-contain"
          />
        </StudioBoard>
      ) : (
        <StudioBoard
          tag="Rascunho"
          caption={
            screen.kind === 'creating'
              ? 'A IA está desenhando a versão final…'
              : 'Muda a cada escolha. A IA desenha a versão final.'
          }
          sticky={screen.kind === 'step'}
          working={screen.kind === 'creating'}
        >
          <DraftLogo
            picks={draftPicks}
            storeName={storeName}
            label={`Rascunho do logo da ${storeName}`}
            className="size-full"
          />
        </StudioBoard>
      )}

      <div className="flex min-w-0 flex-col gap-5">
        {/* Mudou o nome da loja: até ela criar outro logo, o aviso fica em cima das escolhas. */}
        {oldName && (screen.kind === 'step' || screen.kind === 'review') ? (
          <p className="rounded-2xl bg-primary-soft px-4 py-3 text-body text-pretty text-foreground">
            Você mudou o nome pra <strong>{storeName}</strong>. O seu logo ainda mostra {oldName}:{' '}
            {studio.generationsLeft
              ? 'crie outro com o nome novo, ou volte pra seguir com ele.'
              : 'você já criou todos os logos que dava, então pode seguir com ele.'}
          </p>
        ) : null}
        {screen.kind === 'step' ? (
          <ChoiceStep
            step={screen.step}
            number={steps.indexOf(screen.step) + 1}
            total={steps.length}
            titleId={titleId}
            picks={picks}
            storeName={storeName}
            suggestions={suggestions}
            error={error}
            errorId={errorId}
            disabled={Boolean(busy)}
            onPick={pick}
            onPeek={setPeek}
            onUpload={upload}
            onBack={
              steps.indexOf(screen.step) > 0
                ? () => go({ kind: 'step', step: steps[steps.indexOf(screen.step) - 1]! })
                : null
            }
            onNext={() => goOn(screen.step)}
            rail={rail(screen.step)}
          />
        ) : null}
        {screen.kind === 'review' ? (
          <StudioReview
            steps={steps}
            picks={picks}
            titleId={titleId}
            generationsLeft={studio.generationsLeft}
            hasLogos={logos.length > 0}
            error={error}
            errorId={errorId}
            busy={Boolean(busy)}
            onChange={(step) => go({ kind: 'step', step })}
            onCreate={create}
            onShowLogos={() => go({ kind: 'result' })}
            rail={rail(null)}
          />
        ) : null}
        {screen.kind === 'creating' ? (
          <CreatingProgress titleId={titleId} number={logos.length + 1} />
        ) : null}
        {showResult ? (
          <StudioResult
            logos={logos}
            selected={selected}
            storeName={storeName}
            generationsLeft={studio.generationsLeft}
            titleId={titleId}
            busy={Boolean(busy)}
            choosing={busy === 'choosing'}
            error={error}
            errorId={errorId}
            onSelect={(imageId) => {
              setSelectedId(imageId);
              setAnnouncement(
                `Mostrando o logo ${logos.find((logo) => logo.imageId === imageId)?.number}.`,
              );
            }}
            onTweak={tweak}
            onChoose={() => run('choosing', () => chooseLogo(selected.imageId, editing))}
            onChangePicks={() =>
              go(
                isComplete(picks)
                  ? { kind: 'review' }
                  : { kind: 'step', step: firstOpenStep(picks)! },
              )
            }
          />
        ) : null}
      </div>

      {/* Os avisos do que mudou (o rascunho, o logo novo), pro leitor de tela. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
