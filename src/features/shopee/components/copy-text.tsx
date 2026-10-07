'use client';

import { CheckIcon, CopyIcon } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/** Nada a escutar: a área de transferência não muda depois de carregar a página. */
const noSubscribe = () => () => {};
/** A área de transferência só existe no navegador (e em página segura). */
const hasClipboard = () => Boolean(navigator.clipboard);

/**
 * Um texto pra ela levar pra outro site: o campo (só leitura, dá pra selecionar e copiar à mão) e,
 * com JavaScript, o botão que copia de uma vez. Sem JavaScript o botão não aparece: não fica um
 * botão que não faz nada.
 */
export function CopyText({ id, label, text }: { id: string; label: string; text: string }) {
  // No servidor (e sem JavaScript), sem botão.
  const canCopy = useSyncExternalStore(noSubscribe, hasClipboard, () => false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Sem permissão: o texto continua no campo pra copiar à mão.
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-body font-semibold">
        {label}
      </label>
      <Textarea id={id} readOnly defaultValue={text} rows={5} />
      {canCopy ? (
        <Button type="button" variant="soft" onClick={copy}>
          {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
          {copied ? 'Texto copiado' : 'Copiar o texto'}
        </Button>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {copied ? 'Texto copiado. Agora é só colar na Shopee.' : ''}
      </p>
    </div>
  );
}
