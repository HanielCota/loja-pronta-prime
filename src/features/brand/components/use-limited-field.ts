'use client';

import { useRef, useState, type MouseEvent, type RefObject } from 'react';

type Parsed = { ok: true; value: string } | { ok: false; error: string };

/**
 * Um campo de texto com limite de letras (o nome e o texto da loja): o valor, a linha de aviso
 * embaixo e a conferência antes de enviar. O aviso só aparece quando ajuda: o erro do envio, o
 * limite passado ou "ainda cabem N" perto do fim (antes disso, contar letras é ruído).
 */
export function useLimitedField<T extends HTMLInputElement | HTMLTextAreaElement>({
  initial,
  max,
  nearLimit,
  parse,
  normalize = (input) => input.trim(),
}: {
  initial: string;
  max: number;
  /** A partir de quantas letras faltando o "ainda cabem" aparece. */
  nearLimit: number;
  /** A mesma conferência do servidor (o servidor confere de novo). */
  parse: (value: string) => Parsed;
  /** O texto como o servidor conta (o padrão: sem espaço nas pontas). */
  normalize?: (value: string) => string;
}) {
  const [value, setValue] = useState(initial);
  // O erro de quando ela tentou seguir: some assim que ela muda o texto.
  const [error, setError] = useState<string>();
  const ref = useRef<T>(null) as RefObject<T>;

  const text = normalize(value);
  const left = max - text.length;
  const invalid = Boolean(error) || left < 0;
  const note =
    error ??
    (left < 0
      ? `Passou ${-left} ${-left === 1 ? 'letra' : 'letras'} do limite da Shopee.`
      : left <= nearLimit
        ? `Ainda cabe${left === 1 ? '' : 'm'} ${left} ${left === 1 ? 'letra' : 'letras'}.`
        : undefined);

  /** Muda o texto (digitando, tocando numa ideia ou apagando): o erro de antes some. */
  function write(next: string) {
    setValue(next);
    setError(undefined);
  }

  /** Apaga tudo e põe o cursor no campo (o "Apagar"). */
  function clear() {
    write('');
    ref.current?.focus();
  }

  /** No clique de enviar: com algo errado, segura o envio, mostra o erro e volta o foco pro campo. */
  function checkBeforeSubmit(event: MouseEvent) {
    const parsed = parse(value);
    if (parsed.ok) return;
    event.preventDefault();
    setError(parsed.error);
    ref.current?.focus();
  }

  return {
    value,
    text,
    write,
    clear,
    ref,
    note,
    invalid,
    /** Só o que precisa ser anunciado (erro), não o "ainda cabem" a cada letra digitada. */
    announcement: invalid ? note : undefined,
    checkBeforeSubmit,
  };
}
