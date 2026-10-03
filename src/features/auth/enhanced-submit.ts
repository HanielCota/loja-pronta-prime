import { startTransition, type SubmitEvent } from 'react';
import { rememberEmail } from './email-storage';

/**
 * Envio "com JavaScript" dos formulários de acesso, dos dois lados:
 * - no navegador, `submitWithoutReset` marca o envio com este campo;
 * - no servidor, a Server Action vê o campo e devolve o destino (pro mascote comemorar antes de
 *   mudar de tela) em vez de redirecionar na hora. Sem JavaScript, o redirecionamento é direto.
 */
export const ENHANCED_SUBMIT_FIELD = 'enhanced';

/**
 * Envia o formulário pra Server Action sem o reset automático do React 19, que apagaria
 * o email digitado quando o servidor responde com erro. Sem JavaScript, o `action` do
 * `<form>` continua funcionando normalmente.
 */
export function submitWithoutReset(
  validate: (event: SubmitEvent<HTMLFormElement>) => void,
  action: (formData: FormData) => void,
) {
  return (event: SubmitEvent<HTMLFormElement>) => {
    validate(event);
    if (event.defaultPrevented) return;

    event.preventDefault();
    const { submitter } = event.nativeEvent;
    const formData = new FormData(event.currentTarget, submitter);
    formData.set(ENHANCED_SUBMIT_FIELD, '1');
    // Se o envio falhar (internet caiu), a tela é recriada (ActionErrorBoundary) e o email
    // digitado volta sozinho, em vez de ela ter que digitar de novo.
    const email = formData.get('email');
    if (typeof email === 'string' && email) rememberEmail(email);
    startTransition(() => action(formData));
  };
}
