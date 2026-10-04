'use client';

import { Flower2Icon, ImageUpIcon, SparklesIcon } from 'lucide-react';
import { useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { BRAND_PATH } from '../../steps';

/** A letra delicada da marca, pro exemplo de "Só o nome" (a rota marca/fontes serve o arquivo). */
const SCRIPT_FONT = "'Letra do exemplo', var(--font-sans)";

/**
 * O começo do chat, antes da primeira resposta: em vez de só a pergunta e botõezinhos, três
 * cartões grandes, cada um com um exemplo de como fica (com desenho, só o nome, o logo que ela já
 * tem). Ela vê antes de escolher. "Me ajuda a escolher" fica embaixo, pra quem não sabe; e quem
 * quiser escreve na caixa, logo abaixo. Os cartões mandam as mesmas respostas da pergunta.
 */
export function StartChoices({
  storeName,
  disabled,
  onSend,
  onUpload,
}: {
  storeName: string;
  disabled: boolean;
  onSend: (text: string) => void;
  /** Ela escolheu a imagem do próprio logo. */
  onUpload: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-5 [@media(max-height:820px)]:gap-4">
      <style>{`@font-face{font-family:'Letra do exemplo';src:url('${BRAND_PATH}/fontes/delicada') format('woff');font-display:swap}`}</style>
      <fieldset className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <legend className="sr-only">Como você quer o seu logo?</legend>
        <ChoiceCard
          title="Com um desenho"
          description="Uma patinha, uma flor, um coração… com o nome junto."
          disabled={disabled}
          onClick={() => onSend('Um desenho')}
        >
          <span className="flex flex-col items-center gap-1 sm:gap-2">
            <Flower2Icon className="size-9 text-primary sm:size-14" strokeWidth={2} />
            <span className="line-clamp-1 max-w-full px-2 text-sm font-bold sm:text-xl">
              {storeName}
            </span>
          </span>
        </ChoiceCard>
        <ChoiceCard
          title="Só o nome"
          description="O nome da loja escrito numa letra bonita."
          disabled={disabled}
          onClick={() => onSend('Só o nome')}
        >
          <span
            className="line-clamp-2 px-2 text-center text-2xl leading-tight font-bold text-primary sm:text-4xl"
            style={{ fontFamily: SCRIPT_FONT }}
          >
            {storeName}
          </span>
        </ChoiceCard>
        <ChoiceCard
          title="Já tenho um logo"
          description="Mande a imagem do seu logo."
          disabled={disabled}
          dashed
          onClick={() => fileRef.current?.click()}
        >
          <ImageUpIcon className="size-9 text-link sm:size-14" strokeWidth={2} />
        </ChoiceCard>
      </fieldset>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) onUpload(file);
        }}
      />

      <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-lg text-muted-foreground">
        Não sabe?
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSend('Me ajuda a escolher')}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary-soft px-5 font-semibold text-link transition-transform duration-100 outline-none hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.97] disabled:opacity-50 motion-reduce:active:scale-100 forced-colors:border-2 forced-colors:border-[ButtonText]"
        >
          <SparklesIcon aria-hidden="true" className="size-5" />
          Me ajuda a escolher
        </button>
      </p>

      <p
        aria-hidden="true"
        className="flex items-center gap-3 text-lg text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border"
      >
        ou escreva do seu jeito
      </p>
    </div>
  );
}

/**
 * Um cartão de escolha: o exemplo em cima (no celular, à esquerda, pra caber sem rolar), o nome e
 * a explicação. O leitor de tela ouve o nome e, depois, a explicação (o exemplo é só desenho).
 */
function ChoiceCard({
  title,
  description,
  disabled,
  dashed = false,
  onClick,
  children,
}: {
  title: string;
  description: string;
  disabled: boolean;
  /** O exemplo tracejado (onde a imagem dela vai entrar). */
  dashed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <button
      type="button"
      disabled={disabled}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClick={onClick}
      className="flex items-center gap-4 rounded-card border border-input/50 bg-card p-3 text-left shadow-card transition-[border-color,transform] duration-150 outline-none hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100 sm:flex-col sm:items-stretch sm:gap-3 sm:p-4 forced-colors:border-[ButtonText]"
    >
      <span
        aria-hidden="true"
        className={cn(
          'grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary-soft sm:aspect-[16/9] sm:size-auto sm:w-full sm:[@media(max-height:820px)]:aspect-[5/2]',
          dashed && 'border-2 border-dashed border-primary/40',
        )}
      >
        {children}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span id={titleId} className="text-xl font-bold">
          {title}
        </span>
        <span id={descriptionId} className="text-lg leading-snug text-pretty text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  );
}
