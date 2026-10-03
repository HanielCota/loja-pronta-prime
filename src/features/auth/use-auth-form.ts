import { getFormProps, useForm, type SubmissionResult } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { useActionState, useMemo, useState } from 'react';
import type { z } from 'zod';
import { submitWithoutReset } from '@/lib/forms';
import { rememberEmail } from './email-storage';

/**
 * Validação "gentil" em todos os formulários de acesso: o erro aparece ao sair do campo
 * (ou ao enviar) e some enquanto a aluna corrige.
 */
const AUTH_FORM_OPTIONS = {
  shouldValidate: 'onBlur',
  shouldRevalidate: 'onInput',
} as const;

type ActionResult = { submission?: SubmissionResult<string[]> | undefined };

/**
 * Liga um formulário de acesso à sua Server Action: a mesma validação (schema) no navegador e
 * no servidor, o resultado do servidor de volta nos campos e o envio sem apagar o que foi digitado.
 */
export function useAuthForm<Schema extends z.ZodObject, Result extends ActionResult>(
  schema: Schema,
  serverAction: (state: Result | undefined, formData: FormData) => Promise<Result | undefined>,
) {
  const [state, action, pending] = useActionState(serverAction, undefined);
  const constraint = useMemo(() => getZodConstraint(schema), [schema]);
  const [form, fields] = useForm({
    ...AUTH_FORM_OPTIONS,
    lastResult: state?.submission,
    constraint,
    onValidate: ({ formData }) => parseWithZod(formData, { schema }),
  });
  const responseKey = useResponseKey(state);

  const formProps = {
    ...getFormProps(form),
    action,
    onSubmit: submitWithoutReset(form.onSubmit, action, { beforeSend: rememberTypedEmail }),
  };

  return { state, form, fields, pending, responseKey, formProps };
}

/**
 * Se o envio falhar (internet caiu), a tela é recriada (ActionErrorBoundary) e o email digitado
 * volta sozinho, sem ela ter que digitar de novo.
 */
function rememberTypedEmail(formData: FormData) {
  const email = formData.get('email');
  if (typeof email === 'string' && email) rememberEmail(email);
}

/**
 * Número que muda a cada resposta do servidor. Usado como `key` do alerta de erro: assim ele
 * é recriado mesmo quando o erro se repete, e o leitor de tela (e o mascote) reagem de novo.
 */
function useResponseKey(response: unknown): number {
  const [lastResponse, setLastResponse] = useState(response);
  const [key, setKey] = useState(0);
  if (response !== lastResponse) {
    setLastResponse(response);
    setKey((current) => current + 1);
  }
  return key;
}
