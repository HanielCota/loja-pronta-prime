'use client';

import { ArrowRightIcon, CheckIcon, PencilIcon, ShuffleIcon, XIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { parseBrandName } from '../fields';
import { useBrandPending } from './brand-form';
import { useLimitedField } from './use-limited-field';

/** A letra do estilo dela (ver NameStep), com a do site enquanto carrega ou se não carregar. */
const PREVIEW_FONT = "'Letra da marca', var(--font-sans)";

const PAGE = 6;

/** A partir de quantas letras faltando o aviso do limite aparece (antes disso, não ajuda). */
const NEAR_LIMIT = 5;

type NamePickerProps = {
  /** Id do campo (o título da página aponta pra ele). */
  id: string;
  /** O que já vem escrito: o salvo, o da conversa ou vazio. */
  initial: string;
  /** O nome que ela já tem: fica sempre como a primeira ideia, pra voltar a ele. */
  featured: string | undefined;
  ideas: string[];
  max: number;
};

/**
 * O nome da loja num lugar só: o cartão grande é o próprio campo, na letra do logo. Tocar numa
 * ideia só escreve ela no cartão (não salva); o botão embaixo segue com o que está escrito.
 * Sem JavaScript, o campo e o botão funcionam (as ideias só escrevem com ele).
 */
export function NamePicker({ id, initial, featured, ideas, max }: NamePickerProps) {
  const {
    value,
    text: name,
    write,
    clear,
    ref,
    note,
    invalid,
    announcement,
    checkBeforeSubmit,
  } = useLimitedField<HTMLInputElement>({
    initial,
    max,
    nearLimit: NEAR_LIMIT,
    parse: parseBrandName,
    // Como o servidor: espaços repetidos viram um só.
    normalize: (input) => input.replace(/\s+/g, ' ').trim(),
  });
  const [page, setPage] = useState(0);
  const pending = useBrandPending();
  const limitId = useId();
  const groupId = useId();

  const pages = Math.ceil(ideas.length / PAGE);
  const shown = [...(featured ? [featured] : []), ...ideas.slice(page * PAGE, page * PAGE + PAGE)];

  return (
    <>
      <div
        className={cn(
          'relative flex items-center rounded-card border-[1.5px] bg-card px-14 py-7 shadow-card transition-colors duration-150 focus-within:border-primary motion-reduce:transition-none',
          'forced-colors:border-[CanvasText]',
          invalid ? 'border-destructive focus-within:border-destructive' : 'border-transparent',
        )}
      >
        <label htmlFor={id} className="sr-only">
          Nome da loja
        </label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Editar nome da loja"
          className="absolute top-1/2 left-2 size-11 -translate-y-1/2 rounded-full text-muted-foreground"
          onClick={() => ref.current?.focus()}
        >
          <PencilIcon aria-hidden="true" />
        </Button>
        <input
          ref={ref}
          id={id}
          name="name"
          value={value}
          onChange={(event) => write(event.target.value)}
          placeholder="Escreva aqui"
          autoComplete="off"
          enterKeyHint="go"
          aria-describedby={note ? limitId : undefined}
          aria-invalid={invalid || undefined}
          className={cn(
            'w-full min-w-0 bg-transparent text-center leading-tight text-foreground outline-none placeholder:text-muted-foreground',
            // Nome comprido diminui um pouco, pra caber inteiro no cartão.
            name.length > 16 ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl',
          )}
          style={{ fontFamily: PREVIEW_FONT }}
        />
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Apagar o nome"
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full text-muted-foreground"
            onClick={clear}
          >
            <XIcon aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      {/* Uma linha só embaixo do cartão (o erro, o limite passado ou o "ainda cabem"). */}
      <p
        id={limitId}
        className={cn(
          '-mt-1 text-center text-body empty:hidden',
          invalid ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {note}
      </p>
      {/* Anuncia só o erro (não o "ainda cabem" a cada letra digitada). */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="mt-3 flex flex-col gap-3">
        <h2 id={groupId} className="text-body font-semibold">
          {initial ? 'Ou toque numa ideia' : 'Toque numa ideia'}
        </h2>
        <div role="radiogroup" aria-labelledby={groupId} className="flex flex-wrap gap-2.5">
          {shown.map((idea) => {
            const checked = idea === name;
            return (
              <label
                key={idea}
                className={cn(
                  'flex min-h-12 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-4 text-lg shadow-card transition-colors duration-100 motion-reduce:transition-none',
                  'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-focus-visible:outline-solid',
                  'forced-colors:border-[ButtonText]',
                  checked
                    ? 'border-primary bg-primary-soft'
                    : 'border-transparent bg-card hover:border-primary',
                )}
              >
                {/* "ideia" não é lida no servidor: o que vale é o que está no cartão. */}
                <input
                  type="radio"
                  name="ideia"
                  value={idea}
                  className="sr-only"
                  checked={checked}
                  onChange={() => write(idea)}
                />
                {checked ? <CheckIcon aria-hidden="true" className="size-5 text-link" /> : null}
                <span style={{ fontFamily: PREVIEW_FONT }}>{idea}</span>
              </label>
            );
          })}
        </div>
        {pages > 1 ? (
          <div>
            <Button
              type="button"
              variant="ghost"
              size="inline"
              className="min-h-12 px-4 text-link hover:text-link"
              onClick={() => setPage((current) => (current + 1) % pages)}
            >
              <ShuffleIcon aria-hidden="true" />
              Mais ideias
            </Button>
          </div>
        ) : null}
        {/* Avisa o leitor de tela que a lista mudou (o foco fica no botão). */}
        <p aria-live="polite" className="sr-only">
          {page > 0 ? `Novas ideias: ${shown.join(', ')}` : ''}
        </p>
      </div>

      <Button
        type="submit"
        className="mt-3 min-h-14"
        loading={pending}
        loadingText="Salvando…"
        // Confere antes de enviar: o erro aparece junto do cartão, e o foco volta pra ele.
        onClick={checkBeforeSubmit}
      >
        {name ? `Continuar com “${name}”` : 'Continuar'}
        {pending ? null : <ArrowRightIcon aria-hidden="true" />}
      </Button>
    </>
  );
}
