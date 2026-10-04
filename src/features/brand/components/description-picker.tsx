'use client';

import { ArrowRightIcon, CheckIcon, ShuffleIcon, XIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { parseBrandDescription } from '../fields';
import type { DescriptionTone } from '../suggestions';
import { useBrandPending } from './brand-form';
import { useLimitedField } from './use-limited-field';

/** A partir de quantas letras faltando o aviso do limite aparece (antes disso, não ajuda). */
const NEAR_LIMIT = 50;

type DescriptionPickerProps = {
  /** O que já vem escrito: o salvo ou o primeiro texto pronto. */
  initial: string;
  tones: DescriptionTone[];
  storeName: string;
  /** O logo dela, pra prévia do perfil (sem logo ainda, só o nome). */
  logoSrc: string | undefined;
  max: number;
};

/**
 * O texto da loja num lugar só, como o nome: o cartão é a prévia do perfil na Shopee (o logo e o
 * nome em cima) e o próprio campo, já com um texto pronto pra ela só ajustar. Os jeitos de falar
 * trocam o texto do cartão (não salvam); "Outro texto" traz outra versão do mesmo jeito; o botão
 * embaixo segue com o que está escrito. Sem JavaScript, o campo e o botão funcionam.
 */
export function DescriptionPicker({
  initial,
  tones,
  storeName,
  logoSrc,
  max,
}: DescriptionPickerProps) {
  const { value, text, write, clear, ref, note, invalid, announcement, checkBeforeSubmit } =
    useLimitedField<HTMLTextAreaElement>({
      initial,
      max,
      nearLimit: NEAR_LIMIT,
      parse: parseBrandDescription,
    });
  // Qual versão de cada jeito de falar está na vez.
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [lastTone, setLastTone] = useState(tones[0]?.id);
  const pending = useBrandPending();
  const fieldId = useId();
  const noteId = useId();
  const groupId = useId();

  const active = tones.find((tone) => tone.texts.includes(text));

  /** O texto da vez desse jeito de falar; com `next`, a versão seguinte. */
  function applyTone(tone: DescriptionTone, next = false) {
    const current = picks[tone.id] ?? 0;
    const index = next ? (current + 1) % tone.texts.length : current;
    setPicks({ ...picks, [tone.id]: index });
    setLastTone(tone.id);
    write(tone.texts[index] ?? '');
  }

  const anotherTone = active ?? tones.find((tone) => tone.id === lastTone) ?? tones[0];

  return (
    <>
      <div
        className={cn(
          'flex flex-col overflow-hidden rounded-card border-[1.5px] bg-card shadow-card transition-colors duration-150 motion-reduce:transition-none',
          'forced-colors:border-[CanvasText]',
          invalid
            ? 'border-destructive focus-within:border-destructive'
            : 'border-transparent focus-within:border-primary',
        )}
      >
        {/* Como aparece no perfil da loja: o logo e o nome, com o texto embaixo. */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-3">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt=""
              width={44}
              height={44}
              className="size-11 shrink-0 rounded-full ring-1 ring-border"
            />
          ) : null}
          <p className="min-w-0 flex-1 truncate text-body font-semibold">{storeName}</p>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="inline"
              className="-mr-2 px-3"
              onClick={clear}
            >
              <XIcon aria-hidden="true" />
              Apagar
            </Button>
          ) : null}
        </div>
        <label htmlFor={fieldId} className="sr-only">
          Texto da loja
        </label>
        <textarea
          ref={ref}
          id={fieldId}
          name="description"
          rows={5}
          value={value}
          onChange={(event) => write(event.target.value)}
          placeholder="Escreva aqui como é a sua loja"
          aria-describedby={note ? noteId : undefined}
          aria-invalid={invalid || undefined}
          className="[field-sizing:content] min-h-36 w-full resize-none bg-transparent px-5 py-4 text-body leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
      {/* Uma linha só embaixo do cartão: o erro do envio, o limite passado ou o aviso de perto. */}
      <p
        id={noteId}
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
          {initial ? 'Ou escolha um jeito de falar' : 'Escolha um jeito de falar'}
        </h2>
        <div className="flex flex-wrap items-center gap-2.5">
          <div role="radiogroup" aria-labelledby={groupId} className="flex flex-wrap gap-2.5">
            {tones.map((tone) => {
              const checked = active?.id === tone.id;
              return (
                <label
                  key={tone.id}
                  className={cn(
                    'flex min-h-12 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-5 text-body font-semibold shadow-card transition-colors duration-100 motion-reduce:transition-none',
                    'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-focus-visible:outline-solid',
                    'forced-colors:border-[ButtonText]',
                    checked
                      ? 'border-primary bg-primary-soft text-link'
                      : 'border-transparent bg-card hover:border-primary',
                  )}
                >
                  {/* "jeito" não é lido no servidor: o que vale é o que está no cartão. */}
                  <input
                    type="radio"
                    name="jeito"
                    value={tone.id}
                    className="sr-only"
                    checked={checked}
                    onChange={() => applyTone(tone)}
                  />
                  {checked ? <CheckIcon aria-hidden="true" className="size-5" /> : null}
                  {tone.label}
                </label>
              );
            })}
          </div>
          {anotherTone ? (
            <Button
              type="button"
              variant="ghost"
              size="inline"
              className="min-h-12 px-4 text-link hover:text-link"
              onClick={() => applyTone(anotherTone, true)}
            >
              <ShuffleIcon aria-hidden="true" />
              Outro texto
              <span className="sr-only"> {anotherTone.label.toLowerCase()}</span>
            </Button>
          ) : null}
        </div>
      </div>

      <Button
        type="submit"
        className="mt-3 min-h-14"
        loading={pending}
        loadingText="Salvando…"
        // Confere antes de enviar: o erro aparece junto do cartão, e o foco volta pra ele.
        onClick={checkBeforeSubmit}
      >
        Continuar com esse texto
        {pending ? null : <ArrowRightIcon aria-hidden="true" />}
      </Button>
    </>
  );
}
