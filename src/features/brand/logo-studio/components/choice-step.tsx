'use client';

import { ArrowRightIcon, CheckIcon, ImageUpIcon } from 'lucide-react';
import { useId, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LogoPicks } from '../model';
import {
  LOGO_BACKGROUND_IDS,
  LOGO_BACKGROUNDS,
  LOGO_KIND_IDS,
  LOGO_KINDS,
  LOGO_LETTERING_IDS,
  LOGO_LETTERINGS,
  LOGO_LOOK_IDS,
  LOGO_LOOKS,
  LOGO_PALETTE_IDS,
  LOGO_PALETTES,
  LOGO_SYMBOLS,
} from '../options';
import { OWN_COLOR, STUDIO_STEPS, type StudioStep, type StudioSuggestions } from '../picks';
import { DraftLogo } from './draft-logo';
import { WriteOwn } from './write-own';

/** Uma opção da tela: o que ela muda nas escolhas e como se chama. */
type Choice = { value: string; label: string; description?: string; picks: LogoPicks };

/** As opções de cada tela (cada uma já com as escolhas que ela faria). */
function choicesOf(step: StudioStep, picks: LogoPicks, suggestions: StudioSuggestions): Choice[] {
  switch (step) {
    case 'kind':
      return LOGO_KIND_IDS.map((kind) => ({
        value: kind,
        ...LOGO_KINDS[kind],
        // "Com um desenho" mostra um desenho de verdade (o escolhido, ou o sugerido).
        picks: {
          kind,
          ...(kind === 'desenho'
            ? { symbol: picks.symbol ?? { id: suggestions.symbols[0]! } }
            : {}),
        },
      }));
    case 'symbol':
      return suggestions.symbols.map((id) => ({
        value: id,
        label: LOGO_SYMBOLS[id].label,
        picks: { symbol: { id } },
      }));
    case 'colors':
      return [
        // A cor que ela escolheu na conversa, fora da lista: vem primeiro.
        ...(suggestions.customColor
          ? [
              {
                value: OWN_COLOR,
                label: 'A sua cor',
                picks: { colors: { text: suggestions.customColor } },
              },
            ]
          : []),
        ...LOGO_PALETTE_IDS.map((id) => ({
          value: id,
          label: LOGO_PALETTES[id].label,
          picks: { colors: { id } },
        })),
      ];
    case 'lettering':
      return LOGO_LETTERING_IDS.map((id) => ({
        value: id,
        ...LOGO_LETTERINGS[id],
        picks: { lettering: { id } },
      }));
    case 'background':
      return LOGO_BACKGROUND_IDS.map((id) => ({
        value: id,
        ...LOGO_BACKGROUNDS[id],
        picks: { background: id },
      }));
    case 'look':
      return LOGO_LOOK_IDS.map((id) => ({ value: id, ...LOGO_LOOKS[id], picks: { look: id } }));
  }
}

/** O valor escolhido na tela (o que ela escreveu não marca nenhuma opção). */
function chosenValue(
  step: StudioStep,
  picks: LogoPicks,
  suggestions: StudioSuggestions,
): string | undefined {
  const pick = picks[step];
  if (!pick) return undefined;
  if (typeof pick === 'string') return pick;
  if ('id' in pick) return pick.id;
  return step === 'colors' && pick.text === suggestions.customColor ? OWN_COLOR : undefined;
}

function suggestedValue(step: StudioStep, suggestions: StudioSuggestions): string {
  return step === 'symbol' ? suggestions.symbols[0]! : suggestions[step];
}

/** O texto de ajuda embaixo da pergunta, e o exemplo do "do seu jeito" (onde dá pra escrever). */
function helpOf(step: StudioStep, storeName: string): { hint: string; own?: string } {
  switch (step) {
    case 'kind':
      return { hint: 'Toque numa opção. O rascunho do logo muda na hora.' };
    case 'symbol':
      return {
        hint: 'Separamos estes pelo que a sua loja vende.',
        own: 'Ex.: um gatinho com laço',
      };
    case 'colors':
      return { hint: 'As cores vão no desenho e no nome.', own: 'Ex.: verde e branco' };
    case 'lettering':
      return {
        hint: `Veja como fica “${storeName}” em cada uma.`,
        own: 'Ex.: letra de caneta, fina',
      };
    case 'background':
      return { hint: 'É a cor atrás do desenho e do nome.' };
    case 'look':
      return { hint: 'É o jeito do desenho. As cores continuam as mesmas.' };
  }
}

/** Telas com muitas opções pequenas (os desenhos) vão em 4 colunas; as outras, em 2 ou 3. */
const GRID: Record<StudioStep, string> = {
  kind: 'grid-cols-2',
  symbol: 'grid-cols-4 gap-2 sm:gap-3',
  colors: 'grid-cols-2 sm:grid-cols-3',
  lettering: 'grid-cols-2 sm:grid-cols-3',
  background: 'grid-cols-2',
  look: 'grid-cols-2',
};

/**
 * Uma tela de escolha: a pergunta ("Pergunta 2 de 6"), as opções (cada uma é o rascunho do logo
 * já com ela, pra escolher vendo), o "do seu jeito" e o "Continuar". Passando o mouse numa
 * opção, o quadro mostra como fica (`onPeek`).
 */
export function ChoiceStep({
  step,
  number,
  total,
  titleId,
  picks,
  storeName,
  suggestions,
  confirmingChange,
  error,
  errorId,
  disabled,
  onPick,
  onPeek,
  onUpload,
  onBack,
  onNext,
  rail,
  speechAvailable,
}: {
  step: StudioStep;
  number: number;
  total: number;
  titleId: string;
  picks: LogoPicks;
  storeName: string;
  suggestions: StudioSuggestions;
  /** A edição veio do resumo; confirmar volta direto para ele. */
  confirmingChange: boolean;
  error: string | undefined;
  errorId: string;
  disabled: boolean;
  /** Ela escolheu (`label`: o que escolheu, pro aviso do leitor de tela). */
  onPick: (change: LogoPicks, label: string) => void;
  onPeek: (change: LogoPicks | null) => void;
  onUpload: (file: File) => void;
  onBack: (() => void) | null;
  onNext: () => void;
  rail: ReactNode;
  speechAvailable: boolean;
}) {
  const choices = choicesOf(step, picks, suggestions);
  const chosen = chosenValue(step, picks, suggestions);
  const suggested = suggestedValue(step, suggestions);
  const { hint, own } = helpOf(step, storeName);
  const pick = picks[step];
  // O que ela escreveu (a cor da conversa já é uma opção, não um texto dela).
  const ownText =
    pick && typeof pick === 'object' && 'text' in pick && chosen !== OWN_COLOR ? pick.text : '';
  const small = step === 'symbol';
  const title =
    step === 'symbol' ? `Qual desenho combina com a ${storeName}?` : STUDIO_STEPS[step].title;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {rail}
      <div className="flex flex-col gap-1.5">
        <p className="text-body font-semibold text-link">
          Pergunta {number} de {total}
        </p>
        <h1
          id={titleId}
          tabIndex={-1}
          className="text-title font-bold text-balance outline-none sm:text-title-lg"
        >
          {title}
        </h1>
        <p className="text-body text-pretty text-muted-foreground">{hint}</p>
      </div>

      <fieldset
        className={cn('grid min-w-0 gap-3', GRID[step])}
        onPointerLeave={() => onPeek(null)}
      >
        <legend className="sr-only">{title}</legend>
        {choices.map((choice) => (
          <ChoiceTile
            key={choice.value}
            name={`escolha-${step}`}
            choice={choice}
            checked={chosen === choice.value}
            suggested={suggested === choice.value}
            small={small}
            disabled={disabled}
            picks={picks}
            storeName={storeName}
            onPick={() => onPick(choice.picks, choice.label)}
            onPeek={() => onPeek(choice.picks)}
          />
        ))}
      </fieldset>

      {step === 'kind' ? <UploadLink disabled={disabled} onUpload={onUpload} /> : null}

      {ownText ? (
        <p className="rounded-2xl bg-primary-soft px-4 py-3 text-body text-pretty text-foreground">
          Você escreveu: <strong>“{ownText}”</strong>. A IA desenha isso na versão final.
        </p>
      ) : null}
      {own ? (
        <WriteOwn
          // Outra tela, outro campo (o que ela escreveu numa não vai pra outra).
          key={step}
          placeholder={own}
          initial={ownText}
          disabled={disabled}
          speechAvailable={speechAvailable}
          onUse={(text) => onPick({ [step]: { text } }, `“${text}”`)}
        />
      ) : null}

      <p
        id={errorId}
        role="alert"
        className="rounded-2xl bg-destructive-soft px-4 py-3 text-body text-pretty text-destructive empty:hidden forced-colors:border forced-colors:border-[CanvasText]"
      >
        {error}
      </p>

      <div className="flex items-center gap-3">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            className="w-auto border border-border px-5 text-link"
            disabled={disabled}
            onClick={onBack}
          >
            Voltar
          </Button>
        ) : null}
        <Button
          type="button"
          className="flex-1"
          disabled={disabled}
          aria-describedby={error ? errorId : undefined}
          onClick={onNext}
        >
          {confirmingChange ? 'Confirmar mudança' : number === total ? 'Ver o resumo' : 'Continuar'}
          {confirmingChange ? (
            <CheckIcon aria-hidden="true" />
          ) : (
            <ArrowRightIcon aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Uma opção: o rascunho do logo com ela, o nome e, se tiver, a explicação. É um botão de rádio
 * de verdade (setas do teclado trocam de opção); o leitor de tela ouve o nome e a explicação.
 */
function ChoiceTile({
  name,
  choice,
  checked,
  suggested,
  small,
  disabled,
  picks,
  storeName,
  onPick,
  onPeek,
}: {
  name: string;
  choice: Choice;
  checked: boolean;
  suggested: boolean;
  /** Opção pequena (4 por linha): sem explicação, e o "Sugestão" só pro leitor de tela. */
  small: boolean;
  disabled: boolean;
  picks: LogoPicks;
  storeName: string;
  onPick: () => void;
  onPeek: () => void;
}) {
  const id = useId();
  const describedBy = [choice.description ? `${id}-explica` : '', suggested ? `${id}-sugestao` : '']
    .filter(Boolean)
    .join(' ');
  return (
    <label
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') onPeek();
      }}
      className={cn(
        'relative flex min-w-0 cursor-pointer flex-col gap-2 rounded-3xl border-2 bg-card p-2 shadow-card transition-[border-color,transform] duration-150 active:scale-[0.97] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-focus-visible:outline-solid has-disabled:cursor-default has-disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100 forced-colors:border-[ButtonText]',
        small ? 'rounded-2xl p-1.5 pb-2.5' : 'pb-3',
        checked
          ? 'border-primary bg-primary-soft forced-colors:border-4 forced-colors:border-[Highlight]'
          : 'border-transparent hover:border-border',
      )}
    >
      <input
        type="radio"
        name={name}
        value={choice.value}
        checked={checked}
        disabled={disabled}
        // O nome é só o rótulo; a explicação e o "Sugestão" vêm depois, como descrição.
        aria-labelledby={`${id}-nome`}
        aria-describedby={describedBy || undefined}
        onChange={onPick}
        className="sr-only"
      />
      <DraftLogo
        picks={{ ...picks, ...choice.picks }}
        storeName={storeName}
        className={cn(
          'aspect-square w-full border border-border',
          small ? 'rounded-xl' : 'rounded-2xl',
        )}
      />
      <span className={cn('flex flex-col gap-0.5 px-1', small && 'items-center text-center')}>
        <span
          id={`${id}-nome`}
          className={cn('leading-tight font-bold', small ? 'text-sm' : 'text-body')}
        >
          {choice.label}
        </span>
        {choice.description ? (
          <span
            id={`${id}-explica`}
            className="text-sm leading-snug text-pretty text-muted-foreground"
          >
            {choice.description}
          </span>
        ) : null}
      </span>
      {suggested ? (
        <span
          id={`${id}-sugestao`}
          className={cn(
            small
              ? 'sr-only'
              : 'absolute top-3.5 left-3.5 rounded-full bg-card px-2 py-0.5 text-xs font-bold text-progress-text shadow-sm',
          )}
        >
          Sugestão
        </span>
      ) : null}
      {checked ? (
        <span
          aria-hidden="true"
          className={cn(
            'absolute grid place-items-center rounded-full bg-primary text-primary-foreground',
            small ? 'top-2.5 right-2.5 size-5' : 'top-3.5 right-3.5 size-7',
          )}
        >
          <CheckIcon className={small ? 'size-3.5' : 'size-4'} strokeWidth={3} />
        </span>
      ) : null}
    </label>
  );
}

/** "Já tem um logo?": ela manda a imagem dela (vai direto pra tela do logo pronto). */
function UploadLink({ disabled, onUpload }: { disabled: boolean; onUpload: (file: File) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-3xl border-2 border-dashed border-border px-4 py-3 text-body text-muted-foreground">
      Já tem um logo?
      <Button
        type="button"
        variant="link"
        size="inline"
        className="font-semibold"
        disabled={disabled}
        onClick={() => fileRef.current?.click()}
      >
        <ImageUpIcon aria-hidden="true" />
        Enviar a imagem do meu logo
      </Button>
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
    </div>
  );
}
