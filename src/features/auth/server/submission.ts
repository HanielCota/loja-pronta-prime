import type { Submission, SubmissionResult } from '@conform-to/react';
import type { AuthErrorCode } from '../error-codes';

/** Respostas das Server Actions de acesso pro formulário (Conform). */
export type FormResult = SubmissionResult<string[]> | undefined;

// A senha nunca volta pro navegador na resposta da action.
export const HIDDEN_FIELDS = ['password', 'currentPassword'];

/** Resposta de recusa: o código vira a mensagem da tela; a senha nunca volta. */
export function reject(
  submission: Pick<Submission<unknown>, 'reply'>,
  code: AuthErrorCode,
): FormResult {
  return submission.reply({ formErrors: [code], hideFields: HIDDEN_FIELDS });
}
