'use client';

import { ArrowRightIcon, PencilIcon, ShuffleIcon } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { ChoiceButton, useBrandPending } from './brand-form';

/** A letra do estilo dela (ver NameStep), com a do site enquanto carrega ou se não carregar. */
export const PREVIEW_FONT = "'Letra da marca', var(--font-sans)";

const PAGE = 6;

const subscribe = () => () => {};

/**
 * As ideias de nome, 6 por vez, em duas colunas a partir do tablet. "Outras ideias" troca as 6
 * (e volta pras primeiras no fim); só aparece com JavaScript, porque sem ele não faria nada.
 */
export function NameIdeas({ ideas, saved }: { ideas: string[]; saved: string | null }) {
  const [page, setPage] = useState(0);
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const pages = Math.ceil(ideas.length / PAGE);
  const shown = ideas.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2">
        {shown.map((idea) => (
          <li key={idea} className="flex">
            <ChoiceButton
              name="name"
              value={idea}
              label={<span style={{ fontFamily: PREVIEW_FONT }}>{idea}</span>}
              selected={saved === idea}
              className="text-lg"
            />
          </li>
        ))}
      </ul>
      {hydrated && pages > 1 ? (
        <Button
          type="button"
          variant="ghost"
          size="inline"
          className="self-center px-4 text-link hover:text-link"
          onClick={() => setPage((current) => (current + 1) % pages)}
        >
          <ShuffleIcon aria-hidden="true" />
          Outras ideias
        </Button>
      ) : null}
      {/* Avisa o leitor de tela que a lista mudou (o foco fica no botão). */}
      <p aria-live="polite" className="sr-only">
        {page > 0 ? `Novas ideias: ${shown.join(', ')}` : ''}
      </p>
    </>
  );
}

/** "Sim, continuar com esse nome": o botão principal, quando já tem um nome em destaque. */
export function ConfirmNameButton({ name, label }: { name: string; label: string }) {
  const pending = useBrandPending();
  return (
    <Button type="submit" name="name" value={name} loading={pending} loadingText="Salvando…">
      {label}
      {pending ? null : <ArrowRightIcon aria-hidden="true" />}
    </Button>
  );
}

/** Leva até o campo do nome dela (rola e põe o foco nele); sem JavaScript, o link já rola. */
export function WriteOwnNameLink({ fieldId }: { fieldId: string }) {
  return (
    <a
      href={`#${fieldId}`}
      onClick={(event) => {
        const field = document.getElementById(fieldId);
        if (!field) return;
        event.preventDefault();
        field.focus({ preventScroll: true });
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        field.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      }}
      className="inline-flex min-h-11 items-center gap-1.5 self-center rounded-full px-3 font-medium text-link underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
    >
      <PencilIcon aria-hidden="true" className="size-4" />
      Escrever outro nome
    </a>
  );
}
