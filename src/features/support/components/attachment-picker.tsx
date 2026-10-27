'use client';

import { useId, useRef, useState } from 'react';
import { Paperclip, X } from 'lucide-react';
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS,
  REFUSAL_MESSAGES,
  selectAttachments,
  type CandidateFile,
} from '../attachments';

export type PickedFile = CandidateFile & { file: File };

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

async function toCandidate(file: File): Promise<PickedFile> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  return { name: file.name, size: file.size, key: fileKey(file), head, file };
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/**
 * Anexos de uma mensagem: até 3 arquivos (PNG, JPG, WEBP ou PDF, até 5 MB). O navegador recusa
 * antes de enviar, uma frase por arquivo; o servidor confere de novo. Colar um print e arrastar
 * arquivos também funcionam (quem usa passa `addFiles` pro campo de texto). Sem JavaScript, fica o
 * campo de arquivo do navegador.
 */
export function useAttachments() {
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [refusals, setRefusals] = useState<string[]>([]);

  async function addFiles(list: FileList | File[]) {
    const incoming = await Promise.all([...list].map(toCandidate));
    const { accepted, refused } = selectAttachments(files, incoming);
    setFiles((current) => [...current, ...(accepted as PickedFile[])]);
    setRefusals(refused.map((item) => REFUSAL_MESSAGES[item.reason](item.name)));
  }

  function remove(key: string) {
    setFiles((current) => current.filter((item) => item.key !== key));
    setRefusals([]);
  }

  function clear() {
    setFiles([]);
    setRefusals([]);
  }

  return { files, refusals, addFiles, remove, clear };
}

export function AttachmentPicker({
  attachments,
  hint,
}: {
  attachments: ReturnType<typeof useAttachments>;
  /** A dica da situação ("Um print da tela da aula."). */
  hint?: string | undefined;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const { files, refusals, addFiles, remove } = attachments;
  const full = files.length >= MAX_ATTACHMENTS;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={id}
          aria-disabled={full || undefined}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-primary-soft px-5 text-body font-semibold text-link outline-none hover:bg-primary/15 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring aria-disabled:cursor-not-allowed aria-disabled:opacity-60 forced-colors:border-2 forced-colors:border-[ButtonText]"
        >
          <Paperclip aria-hidden="true" className="size-5" />
          Anexar arquivos
          <input
            ref={input}
            id={id}
            type="file"
            multiple
            accept={ATTACHMENT_ACCEPT}
            disabled={full}
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) void addFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </label>
        <span className="text-sm text-muted-foreground">
          Até {MAX_ATTACHMENTS} arquivos: PNG, JPG, WEBP ou PDF, até 5 MB cada.
        </span>
      </div>
      {hint ? <p className="text-sm text-muted-foreground">Ajuda mandar: {hint}</p> : null}
      <p className="text-sm text-muted-foreground">Não envie foto de documento nem dados de cartão.</p>
      {files.length ? (
        <ul aria-label="Arquivos anexados" className="flex flex-col gap-2">
          {files.map((item) => (
            <li
              key={item.key}
              className="flex min-h-11 items-center justify-between gap-3 rounded-2xl bg-muted px-4 py-2 text-body"
            >
              <span className="min-w-0 break-words">
                {item.name} <span className="text-sm text-muted-foreground">({formatSize(item.size)})</span>
              </span>
              <button
                type="button"
                onClick={() => remove(item.key)}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-card hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                aria-label={`Tirar ${item.name}`}
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {refusals.length ? (
        <ul role="alert" className="flex flex-col gap-1 text-body text-destructive">
          {refusals.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Coloca os arquivos escolhidos no envio (o campo do navegador fica vazio com JavaScript). */
export function appendAttachments(form: FormData, files: readonly PickedFile[]) {
  form.delete('anexos');
  for (const item of files) form.append('anexos', item.file, item.file.name);
}
