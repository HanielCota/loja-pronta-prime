'use client';

import { CircleAlertIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { upsetMascot } from '@/components/brand/mascot';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { AuthErrorCode } from '../error-codes';
import { AUTH_ERROR_MESSAGES } from '../messages';

/** Erros causados pela tentativa: o mascote fecha a cara. Nos demais, fica preocupado. */
const GRUMPY_ERRORS: ReadonlySet<AuthErrorCode> = new Set(['invalid_credentials', 'rate_limited']);

/** `id`: o do erro do formulário (form.errorId), que o Conform liga ao <form> via aria-describedby. */
export function AuthErrorAlert({ code, id }: { code: AuthErrorCode; id?: string }) {
  const { title, hint } = AUTH_ERROR_MESSAGES[code];
  const ref = useRef<HTMLDivElement>(null);

  // A cada erro (o alerta é recriado a cada resposta), o mascote olha pra ele e reage.
  useEffect(() => {
    upsetMascot(GRUMPY_ERRORS.has(code) ? 'grumpy' : 'worried', ref.current ?? undefined);
  }, [code]);

  return (
    // data-error-code: identifica o erro na tela (usado pelos testes).
    <Alert ref={ref} id={id} variant="destructive" data-error-code={code}>
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      {hint ? <AlertDescription>{hint}</AlertDescription> : null}
    </Alert>
  );
}
