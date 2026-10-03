import { useEffect, useRef, type RefObject } from 'react';

/** Tempo pra marcação aparecer antes de seguir. */
const ADVANCE_DELAY_MS = 250;

/**
 * Avanço automático das perguntas de escolha única: tocar ou clicar na opção envia o formulário
 * logo depois; pelo teclado, não (as setas trocam a opção marcada, e avançar a cada seta tiraria a
 * pessoa da pergunta). Um avanço por vez: um toque novo troca o anterior, sair da pergunta cancela,
 * e nada é enviado enquanto um envio está em andamento.
 */
export function useAutoAdvance(formRef: RefObject<HTMLFormElement | null>, pending: boolean) {
  const fromPointerRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // O `pending` do render pode estar velho dentro do timer.
  const sendingRef = useRef(false);

  useEffect(() => {
    sendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    const fromPointer = () => (fromPointerRef.current = true);
    const fromKeyboard = () => (fromPointerRef.current = false);
    window.addEventListener('pointerdown', fromPointer, { capture: true });
    window.addEventListener('keydown', fromKeyboard, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', fromPointer, { capture: true });
      window.removeEventListener('keydown', fromKeyboard, { capture: true });
      clearTimeout(timerRef.current);
    };
  }, []);

  return {
    /** Agenda o envio, se a escolha veio de toque ou clique. */
    afterChoice() {
      if (!fromPointerRef.current) return;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (!sendingRef.current) formRef.current?.requestSubmit();
      }, ADVANCE_DELAY_MS);
    },
    /** Envio feito por outro caminho (botão, Enter): o agendado não vale mais. */
    cancel() {
      clearTimeout(timerRef.current);
    },
    isSending() {
      return sendingRef.current;
    },
  };
}
