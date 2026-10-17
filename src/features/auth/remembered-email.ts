import { useLayoutEffect, useRef } from 'react';
import { readRememberedEmail, rememberEmail } from './email-storage';

export { rememberEmail };

/**
 * Preenche o campo com o email lembrado, logo depois de a tela carregar. É de uso único (sai do
 * armazenamento ao ser lido) e não sobrescreve o que já está no campo, como o preenchimento
 * automático do navegador ou o que a pessoa digitou antes de a página terminar de carregar.
 */
export function useRestoreRememberedEmail(inputId: string): void {
  const inputIdRef = useRef(inputId);

  // Atualiza o campo existente e avisa o Conform pelo evento nativo. form.update cria uma
  // intenção com efeito posterior que remonta o input e pode disputar a próxima digitação.
  useLayoutEffect(() => {
    const email = readRememberedEmail();
    if (!email) return;
    rememberEmail('');
    const input = document.getElementById(inputIdRef.current);
    if (!(input instanceof HTMLInputElement) || input.value || document.activeElement === input)
      return;
    input.value = email;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, []);
}
