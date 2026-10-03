'use client';

import { CircleCheckIcon, CircleIcon } from 'lucide-react';
import { createContext, useActionState, useContext, useEffect, useId, type ReactNode } from 'react';
import { upsetMascot } from '@/components/brand/mascot';
import { FieldError } from '@/components/ui/field';
import { submitWithoutReset } from '@/lib/forms';
import { cn } from '@/lib/utils';
import type { BrandResult } from '../server/actions';

const PendingContext = createContext(false);

/** O formulário está salvando (os botões dele ficam esperando). */
export function useBrandPending(): boolean {
  return useContext(PendingContext);
}

type BrandFormProps = {
  action: (state: BrandResult, formData: FormData) => Promise<BrandResult>;
  /** Veio da revisão pra mudar algo: salvar volta pra ela. */
  editing?: boolean;
  /** Pra um botão de fora (numa janela) enviar este formulário, com `form`. */
  id?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Formulário de um passo da marca: Server Action de verdade (funciona sem JavaScript), sem apagar
 * o que ela digitou quando volta um erro, e o erro aparece embaixo, anunciado.
 */
export function BrandForm({ action, editing = false, id, className, children }: BrandFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errorId = useId();

  useEffect(() => {
    if (state?.error) upsetMascot('worried');
  }, [state]);

  return (
    <form
      id={id}
      action={formAction}
      onSubmit={submitWithoutReset(() => {}, formAction)}
      aria-describedby={state?.error ? errorId : undefined}
      className={cn('flex flex-col gap-3', className)}
    >
      {editing ? <input type="hidden" name="editing" value="1" /> : null}
      <PendingContext value={pending}>{children}</PendingContext>
      {/* Sempre no código (vazio, fora do fluxo): assim o "Salvando…" é anunciado. */}
      <p aria-live="polite" className="text-sm text-muted-foreground empty:sr-only">
        {pending ? 'Salvando…' : ''}
      </p>
      <FieldError id={errorId}>{state?.error}</FieldError>
    </form>
  );
}

type ChoiceButtonProps = {
  name: string;
  value: string;
  /** O que ela vê e o leitor de tela lê. */
  label: ReactNode;
  /** Linha menor embaixo ("O nome que você escolheu"). */
  detail?: string | undefined;
  /** É a escolha salva agora. */
  selected?: boolean;
  /** Conteúdo grande acima do rótulo (ex.: a imagem do logo). */
  media?: ReactNode;
  className?: string;
};

/**
 * Uma opção que já é o botão de enviar: um toque escolhe e segue, sem "marcar e depois
 * continuar" (menos passos pra quem tem pouca prática). Sem JavaScript, funciona igual.
 * Todas com o mesmo sinal de escolha (a bolinha, que fica marcada na salva), não uma seta, que
 * daria a ideia de abrir outra tela.
 */
export function ChoiceButton({
  name,
  value,
  label,
  detail,
  selected = false,
  media,
  className,
}: ChoiceButtonProps) {
  const pending = useBrandPending();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      aria-disabled={pending || undefined}
      onClick={(event) => {
        if (pending) event.preventDefault();
      }}
      className={cn(
        'group flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-3xl border-[1.5px] bg-card px-5 py-3 text-left text-body font-medium shadow-card transition-[background-color,border-color,transform] duration-100 outline-none active:scale-[0.98] motion-reduce:active:scale-100',
        'hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid',
        selected ? 'border-primary bg-primary-soft' : 'border-transparent',
        media && 'flex-col items-stretch p-3 text-center',
        'aria-disabled:cursor-wait forced-colors:border-[ButtonText]',
        className,
      )}
    >
      {media}
      <span className={cn('flex flex-1 flex-col gap-0.5', media && 'items-center')}>
        <span className="text-pretty">
          {label}
          {/* A bolinha marcada é só desenho: o leitor de tela ouve qual é a salva. */}
          {selected ? <span className="sr-only"> (escolha salva)</span> : null}
        </span>
        {detail ? (
          <span className="text-sm font-normal text-muted-foreground">{detail}</span>
        ) : null}
      </span>
      {media ? null : selected ? (
        <CircleCheckIcon aria-hidden="true" className="size-6 shrink-0 text-link" />
      ) : (
        <CircleIcon
          aria-hidden="true"
          className="size-6 shrink-0 text-muted-foreground group-hover:text-link"
        />
      )}
    </button>
  );
}
