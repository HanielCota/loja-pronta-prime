'use client';

import { CircleAlertIcon } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { upsetMascot } from '@/components/brand/mascot';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { AuthErrorCode } from '../error-codes';
import { AUTH_ERROR_MESSAGES } from '../messages';

/** Erros causados pela tentativa: o mascote fecha a cara. Nos demais, fica preocupado. */
const GRUMPY_ERRORS: ReadonlySet<AuthErrorCode> = new Set(['invalid_credentials', 'rate_limited']);

/** `id`: o do erro do formulário (form.errorId), que o Conform liga ao <form> via aria-describedby. */
export function AuthErrorAlert({
  code,
  id,
  speech = false,
  children,
}: {
  code: AuthErrorCode;
  id?: string;
  /** No login, a orientação aparece como uma fala da Lupita. */
  speech?: boolean;
  children?: ReactNode;
}) {
  const { title, hint } = AUTH_ERROR_MESSAGES[code];
  const ref = useRef<HTMLDivElement>(null);

  // A cada erro (o alerta é recriado a cada resposta), o mascote olha pra ele e reage.
  useEffect(() => {
    upsetMascot(GRUMPY_ERRORS.has(code) ? 'grumpy' : 'worried', ref.current ?? undefined);
  }, [code]);

  return (
    // data-error-code: identifica o erro na tela (usado pelos testes).
    <Alert
      ref={ref}
      id={id}
      variant="destructive"
      data-error-code={code}
      data-mascot-speech={speech || undefined}
      className={
        speech
          ? 'before:absolute before:-top-2 before:left-6 before:size-4 before:rotate-45 before:bg-inherit forced-colors:border forced-colors:border-[CanvasText] forced-colors:before:hidden'
          : undefined
      }
    >
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>
        {speech ? <span className="mb-1 block font-normal">Lupita</span> : null}
        {title}
      </AlertTitle>
      {hint || children ? (
        <AlertDescription className="flex min-w-0 flex-col gap-3">
          {hint ? <p className="text-pretty">{hint}</p> : null}
          {children}
        </AlertDescription>
      ) : null}
    </Alert>
  );
}
