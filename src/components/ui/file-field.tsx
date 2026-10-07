'use client';

import * as React from 'react';
import { UploadIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from './label';

const noSubscribe = () => () => {};

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

type FileFieldProps = Omit<React.ComponentProps<'input'>, 'type' | 'id' | 'onChange'> & {
  id: string;
  /** O nome do campo, em cima (ex.: "Imagem do banner"). */
  label: string;
  /** Formatos e tamanho aceitos, embaixo. */
  hint?: string;
  /** Texto do botão (padrão: "Escolher arquivo"). */
  buttonLabel?: string;
  onFile?: (file: File | null) => void;
  /** O arquivo escolhido, quando quem usa guarda (e limpa depois de enviar). */
  file?: File | null;
  inputRef?: React.Ref<HTMLInputElement>;
};

/**
 * Escolher arquivo sem o campo cinza do navegador: o rótulo e um botão azul-claro (que é o rótulo
 * do campo, escondido) e, embaixo, o nome e o tamanho do arquivo escolhido. Até a página
 * hidratar (e sem JavaScript), aparece o campo do navegador, que envia sozinho com o formulário.
 */
export function FileField({
  id,
  label,
  hint,
  buttonLabel = 'Escolher arquivo',
  onFile,
  inputRef,
  file: chosenFile,
  className,
  ...props
}: FileFieldProps) {
  const hydrated = React.useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  const [ownFile, setOwnFile] = React.useState<File | null>(null);
  const file = chosenFile === undefined ? ownFile : chosenFile;
  const titleId = `${id}-titulo`;
  const statusId = `${id}-arquivo`;
  const hintId = hint ? `${id}-ajuda` : undefined;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label id={titleId} htmlFor={id}>
        {label}
      </Label>
      <div className="flex flex-wrap items-center gap-3">
        <input
          {...props}
          id={id}
          ref={inputRef}
          type="file"
          aria-labelledby={titleId}
          aria-describedby={[hydrated && statusId, hintId].filter(Boolean).join(' ') || undefined}
          className={cn(
            'peer',
            hydrated
              ? 'sr-only'
              : 'w-full text-body text-foreground file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-primary-soft file:px-4 file:text-body file:font-semibold file:text-link',
          )}
          onChange={(event) => {
            const chosen = event.currentTarget.files?.[0] ?? null;
            setOwnFile(chosen);
            onFile?.(chosen);
          }}
        />
        {hydrated ? (
          <>
            {/* O botão é o rótulo do campo: tocar abre a escolha do aparelho. */}
            <label
              htmlFor={id}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-primary-soft px-5 text-body font-semibold text-link peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-50 hover:bg-primary/15 forced-colors:border-2 forced-colors:border-[ButtonText]"
            >
              <UploadIcon aria-hidden="true" className="size-5" />
              {file ? 'Trocar arquivo' : buttonLabel}
            </label>
            <span id={statusId} className="min-w-0 text-body break-all text-muted-foreground">
              {file ? `${file.name} · ${formatSize(file.size)}` : 'Nenhum arquivo escolhido'}
            </span>
          </>
        ) : null}
      </div>
      {hint ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
