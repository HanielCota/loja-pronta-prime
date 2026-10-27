'use client';

import { useActionState } from 'react';
import { ExternalLinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldError } from '@/components/ui/field';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import {
  completeManualShopeeAuthorization,
  startManualShopeeAuthorization,
} from '../server/actions';

/** A autorização abre em outra aba; o endereço volta por POST, sem guardar o código na página. */
export function ManualConnectionForm({
  origin = 'loja-pronta',
}: {
  origin?: 'sll' | 'loja-pronta' | 'recovered';
}) {
  const [start, startAction, starting] = useActionState(startManualShopeeAuthorization, undefined);
  const [result, completeAction, completing] = useActionState(
    completeManualShopeeAuthorization,
    undefined,
  );

  if (!start?.authorizationUrl && !result?.error) {
    return (
      <form action={startAction} className="flex flex-col gap-3">
        <input type="hidden" name="origin" value={origin} />
        <p className="text-body text-pretty text-muted-foreground">
          Você autoriza na Shopee e volta aqui para colar o endereço que aparecer. Vamos conferir a
          autorização antes de conectar sua loja.
        </p>
        <FieldError>{start?.error}</FieldError>
        <Button type="submit" loading={starting} loadingText="Preparando…">
          Conectar minha loja
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="list-decimal space-y-2 pl-6 text-body text-pretty">
        <li>Toque em “Autorizar na Shopee” e confirme o acesso à sua loja.</li>
        <li>
          Depois, pode aparecer uma imagem ou um aviso. Copie o endereço inteiro da barra do
          navegador.
        </li>
        <li>
          Volte para esta aba, cole o endereço abaixo e toque em “Concluir conexão”. Faça isso em
          até 10 minutos.
        </li>
      </ol>
      {start?.authorizationUrl ? (
        <Button asChild variant="soft">
          <a href={start.authorizationUrl} target="_blank" rel="noreferrer">
            Autorizar na Shopee
            <ExternalLinkIcon aria-hidden="true" />
            <span className="sr-only"> (abre em outra aba)</span>
          </a>
        </Button>
      ) : null}
      <form action={completeAction} className="flex flex-col gap-3">
        <input type="hidden" name="origin" value={origin} />
        <Field>
          <FloatingLabelInput
            id="shopee-return-url"
            name="returnUrl"
            type="url"
            label="Endereço depois de autorizar"
            required
            maxLength={6000}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-describedby={`shopee-return-help${result?.error ? ' shopee-return-error' : ''}`}
            aria-invalid={Boolean(result?.error) || undefined}
          />
          <p id="shopee-return-help" className="px-1 text-sm text-pretty text-muted-foreground">
            Cole o endereço só aqui. Ele contém um código de uso único da sua loja.
          </p>
          <FieldError id="shopee-return-error">{result?.error}</FieldError>
        </Field>
        <Button type="submit" loading={completing} loadingText="Conferindo conexão…">
          Concluir conexão
        </Button>
      </form>
    </div>
  );
}
