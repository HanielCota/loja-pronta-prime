'use client';

import { useActionState, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FilePlus2, Film, ImagePlus, Link2, Plus, Save, Trash2, Type, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { panelCard } from '@/features/member/components/area-shell';
import { saveLearningLesson } from '../server/actions';
import type { LessonEditState } from '../server/actions';

const initialLessonEditState: LessonEditState = { message: '', saved: false };

type EditableBlock = {
  id: string;
  kind: 'text' | 'link' | 'video' | 'file' | 'image';
  data: Record<string, string>;
};
type NewBlockKind = EditableBlock['kind'];

const newBlockTitle: Record<NewBlockKind, string> = {
  text: 'Novo texto',
  link: 'Novo link',
  video: 'Novo vídeo',
  image: 'Nova imagem',
  file: 'Novo arquivo',
};

const removeBlockLabel: Record<NewBlockKind, string> = {
  text: 'Remover texto',
  link: 'Remover link',
  video: 'Remover vídeo',
  image: 'Remover imagem',
  file: 'Remover arquivo',
};

export function LessonEditor({
  lesson,
  onCancel,
}: {
  lesson: {
    id: string;
    title: string;
    description: string | null;
    blocks: Array<{ id: string; kind: string; data: Record<string, string> }>;
  };
  onCancel: () => void;
}) {
  const router = useRouter();
  const [newBlocks, setNewBlocks] = useState<Array<{ key: string; kind: NewBlockKind }>>([]);
  // Limpa os blocos novos a cada salvamento: depois do refresh eles já aparecem como
  // blocos existentes e, se ficassem no formulário, o próximo salvamento os gravaria de novo.
  const [state, formAction, pending] = useActionState(
    async (previous: LessonEditState, formData: FormData) => {
      const next = await saveLearningLesson(previous, formData);
      if (next.saved) {
        setNewBlocks([]);
        router.refresh();
      }
      return next;
    },
    initialLessonEditState,
  );
  const [uploadNotice, setUploadNotice] = useState('');
  const editableBlocks = lesson.blocks.filter(
    (block): block is EditableBlock =>
      block.kind === 'text' ||
      block.kind === 'link' ||
      block.kind === 'video' ||
      block.kind === 'file' ||
      block.kind === 'image',
  );

  // Imagem e arquivo novos vão pelo envio próprio, não pelo "Salvar alterações": só texto,
  // link e vídeo entram no formulário, numerados na ordem em que o servidor vai ler.
  const formIndexByKey = new Map(
    newBlocks
      .filter((block) => block.kind === 'text' || block.kind === 'link' || block.kind === 'video')
      .map((block, index) => [block.key, index]),
  );

  return (
    <form action={formAction} className={cn(panelCard, '!p-4 sm:!p-6')}>
      <input name="lessonId" type="hidden" value={lesson.id} />
      <h3 className="text-title font-semibold text-foreground">Editar aula</h3>
      <p className="mt-2 text-body text-muted-foreground">
        Altere o título, a descrição, os textos e os links desta aula.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        <FloatingLabelInput
          defaultValue={lesson.title}
          id="lesson-title"
          label="Título da aula"
          name="title"
          required
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="lesson-description">Descrição da aula</Label>
          <textarea
            className="min-h-28 w-full rounded-field border border-input bg-background px-4 py-3 text-body text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            defaultValue={lesson.description ?? ''}
            id="lesson-description"
            maxLength={1200}
            name="description"
          />
        </div>

        {editableBlocks.map((block, index) => (
          <fieldset
            className="flex flex-col gap-3 rounded-2xl border border-border p-4 forced-colors:border forced-colors:border-[CanvasText]"
            key={block.id}
          >
            <legend className="px-1 text-body font-semibold text-foreground">
              {`${
                block.kind === 'text'
                  ? 'Texto'
                  : block.kind === 'link'
                    ? 'Link'
                    : block.kind === 'video'
                      ? 'Vídeo'
                      : block.kind === 'image'
                        ? 'Imagem'
                        : 'Arquivo'
              } ${index + 1}`}
            </legend>
            <input name="blockId" type="hidden" value={block.id} />
            <input name={`block:${block.id}:kind`} type="hidden" value={block.kind} />
            {block.kind === 'text' ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor={`block-${block.id}-text`}>Texto da aula</Label>
                <textarea
                  className="min-h-36 w-full rounded-field border border-input bg-background px-4 py-3 text-body text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  defaultValue={block.data.text ?? ''}
                  id={`block-${block.id}-text`}
                  maxLength={12000}
                  name={`block:${block.id}:text`}
                  required
                />
              </div>
            ) : block.kind === 'link' ? (
              <>
                <FloatingLabelInput
                  defaultValue={block.data.label ?? ''}
                  id={`block-${block.id}-label`}
                  label="Nome do link"
                  name={`block:${block.id}:label`}
                  required
                />
                <FloatingLabelInput
                  autoCapitalize="none"
                  defaultValue={block.data.url ?? ''}
                  id={`block-${block.id}-url`}
                  label="Endereço do link"
                  name={`block:${block.id}:url`}
                  required
                  type="url"
                />
              </>
            ) : block.kind === 'video' ? (
              <>
                <FloatingLabelInput
                  defaultValue={block.data.videoId ?? ''}
                  id={`block-${block.id}-video-id`}
                  label="ID do vídeo Panda"
                  name={`block:${block.id}:videoId`}
                  required
                />
                <p className="text-body text-muted-foreground">
                  Use o ID do vídeo que aparece na referência Panda do conteúdo.
                </p>
              </>
            ) : block.kind === 'file' ? (
              <>
                <FloatingLabelInput
                  defaultValue={block.data.fileName ?? ''}
                  id={`block-${block.id}-file-name`}
                  label="Nome do arquivo"
                  name={`block:${block.id}:fileName`}
                  required
                />
                <a
                  className="inline-flex min-h-11 items-center text-body font-medium text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  href={`/api/sll/material/${block.id}`}
                >
                  Baixar arquivo atual
                </a>
                <MediaUpload
                  blockId={block.id}
                  kind="file"
                  lessonId={lesson.id}
                  onUploaded={() => router.refresh()}
                />
              </>
            ) : (
              <>
                <MediaUpload
                  blockId={block.id}
                  initialAlt={block.data.alt ?? ''}
                  kind="image"
                  lessonId={lesson.id}
                  altFieldName={`block:${block.id}:alt`}
                  onUploaded={() => router.refresh()}
                />
              </>
            )}
          </fieldset>
        ))}
        {editableBlocks.length === 0 ? (
          <p className="text-body text-muted-foreground">
            Esta aula ainda não tem texto ou link para editar.
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2 xl:grid-cols-3">
          <Button
            className="!w-full"
            onClick={() =>
              setNewBlocks((blocks) => [...blocks, { key: crypto.randomUUID(), kind: 'text' }])
            }
            type="button"
            variant="soft"
          >
            <Plus aria-hidden="true" />
            <Type aria-hidden="true" />
            Adicionar texto
          </Button>
          <Button
            className="!w-full"
            onClick={() =>
              setNewBlocks((blocks) => [...blocks, { key: crypto.randomUUID(), kind: 'link' }])
            }
            type="button"
            variant="soft"
          >
            <Plus aria-hidden="true" />
            <Link2 aria-hidden="true" />
            Adicionar link
          </Button>
          <Button
            className="!w-full"
            onClick={() =>
              setNewBlocks((blocks) => [...blocks, { key: crypto.randomUUID(), kind: 'video' }])
            }
            type="button"
            variant="soft"
          >
            <Plus aria-hidden="true" />
            <Film aria-hidden="true" />
            Adicionar vídeo
          </Button>
          <Button
            className="!w-full"
            onClick={() =>
              setNewBlocks((blocks) => [...blocks, { key: crypto.randomUUID(), kind: 'image' }])
            }
            type="button"
            variant="soft"
          >
            <Plus aria-hidden="true" />
            <ImagePlus aria-hidden="true" />
            Adicionar imagem
          </Button>
          <Button
            className="!w-full"
            onClick={() =>
              setNewBlocks((blocks) => [...blocks, { key: crypto.randomUUID(), kind: 'file' }])
            }
            type="button"
            variant="soft"
          >
            <Plus aria-hidden="true" />
            <FilePlus2 aria-hidden="true" />
            Adicionar arquivo
          </Button>
        </div>

        {newBlocks.map((block) => {
          const index = formIndexByKey.get(block.key);
          return (
            <fieldset
              className="flex flex-col gap-3 rounded-2xl border border-border p-4 forced-colors:border forced-colors:border-[CanvasText]"
              key={block.key}
            >
              <legend className="px-1 text-body font-semibold text-foreground">
                {newBlockTitle[block.kind]}
              </legend>
              {index !== undefined ? (
                <input name="newBlockKind" type="hidden" value={block.kind} />
              ) : null}
              {block.kind === 'text' ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`new-block-${block.key}-text`}>Texto da aula</Label>
                  <textarea
                    className="min-h-36 w-full rounded-field border border-input bg-background px-4 py-3 text-body text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    id={`new-block-${block.key}-text`}
                    maxLength={12000}
                    name={`newBlock:${index}:text`}
                    required
                  />
                </div>
              ) : block.kind === 'link' ? (
                <>
                  <FloatingLabelInput
                    id={`new-block-${block.key}-label`}
                    label="Nome do link"
                    name={`newBlock:${index}:label`}
                    required
                  />
                  <FloatingLabelInput
                    autoCapitalize="none"
                    id={`new-block-${block.key}-url`}
                    label="Endereço do link"
                    name={`newBlock:${index}:url`}
                    required
                    type="url"
                  />
                </>
              ) : block.kind === 'video' ? (
                <>
                  <FloatingLabelInput
                    id={`new-block-${block.key}-video-id`}
                    label="ID do vídeo Panda"
                    name={`newBlock:${index}:videoId`}
                    required
                  />
                  <p className="text-body text-muted-foreground">
                    Use o ID do vídeo que aparece na referência Panda do conteúdo.
                  </p>
                </>
              ) : (
                <MediaUpload
                  kind={block.kind}
                  lessonId={lesson.id}
                  onUploaded={() => {
                    setNewBlocks((blocks) => blocks.filter((item) => item.key !== block.key));
                    setUploadNotice(
                      block.kind === 'image'
                        ? 'A imagem foi adicionada à aula.'
                        : 'O arquivo foi adicionado à aula.',
                    );
                    router.refresh();
                  }}
                />
              )}
              <Button
                aria-label={removeBlockLabel[block.kind]}
                className="w-fit"
                onClick={() =>
                  setNewBlocks((blocks) => blocks.filter((item) => item.key !== block.key))
                }
                type="button"
                variant="ghost"
              >
                <Trash2 aria-hidden="true" />
                Remover
              </Button>
            </fieldset>
          );
        })}

        {uploadNotice ? (
          <output aria-live="polite" className="text-body text-foreground">
            {uploadNotice}
          </output>
        ) : null}

        {state.message ? (
          state.saved ? (
            <output aria-live="polite" className="text-body text-foreground">
              {state.message}
            </output>
          ) : (
            <p className="text-body text-destructive" role="alert">
              {state.message}
            </p>
          )
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button loading={pending} loadingText="Salvando…" type="submit">
            <Save aria-hidden="true" />
            Salvar alterações
          </Button>
          <Button onClick={onCancel} type="button" variant="soft">
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  );
}

function MediaUpload({
  blockId,
  altFieldName,
  initialAlt,
  kind,
  lessonId,
  onUploaded,
}: {
  blockId?: string;
  altFieldName?: string;
  initialAlt?: string;
  kind: 'image' | 'file';
  lessonId: string;
  onUploaded: () => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState(initialAlt ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function upload() {
    if (!file) {
      setMessage('Escolha um arquivo primeiro.');
      return;
    }
    if (kind === 'image' && !alt.trim()) {
      setMessage('Escreva uma descrição para a imagem.');
      return;
    }

    setBusy(true);
    setMessage('');
    const form = new FormData();
    form.set('lessonId', lessonId);
    form.set('kind', kind);
    form.set('file', file);
    if (blockId) form.set('replaceBlockId', blockId);
    if (kind === 'image') form.set('alt', alt);

    try {
      const response = await fetch('/api/admin/learning-content/media', {
        method: 'POST',
        body: form,
      });
      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setMessage(result?.message ?? 'Não consegui guardar o material. Tente de novo.');
        return;
      }
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      setMessage(blockId ? 'O material foi atualizado.' : 'O material foi adicionado à aula.');
      onUploaded();
    } catch {
      setMessage('Não consegui guardar o material. Confira a internet e tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-4 forced-colors:border forced-colors:border-[CanvasText]">
      {kind === 'image' ? (
        <FloatingLabelInput
          id={`${inputId}-alt`}
          label="Descrição da imagem"
          maxLength={300}
          name={altFieldName}
          onChange={(event) => setAlt(event.currentTarget.value)}
          // Só a imagem já salva tem a descrição no "Salvar alterações". Na nova, o campo
          // obrigatório travaria o formulário da aula inteira; o envio confere sozinho.
          required={Boolean(altFieldName)}
          value={alt}
        />
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor={inputId}>{kind === 'image' ? 'Imagem' : 'Arquivo'}</Label>
        <input
          accept={
            kind === 'image'
              ? 'image/png,image/jpeg,image/webp'
              : '.pdf,.zip,.docx,.xlsx,.pptx,.txt,.csv'
          }
          className="min-h-12 w-full rounded-field border border-input bg-background px-3 py-2 text-body text-foreground file:mr-3 file:min-h-10 file:rounded-full file:border-0 file:bg-primary-soft file:px-4 file:font-semibold file:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          id={inputId}
          onChange={(event) => {
            setFile(event.currentTarget.files?.[0] ?? null);
            setMessage('');
          }}
          ref={inputRef}
          type="file"
        />
        <p className="text-body text-muted-foreground">
          {kind === 'image'
            ? 'PNG, JPG ou WebP. Até 20 MB.'
            : 'PDF, ZIP, DOCX, XLSX, PPTX, TXT ou CSV. Até 20 MB.'}
        </p>
      </div>
      {file ? <p className="text-body text-foreground">Escolhido: {file.name}</p> : null}
      {message ? (
        <output aria-live="polite" className="text-body text-foreground">
          {message}
        </output>
      ) : null}
      <Button
        className="w-fit"
        loading={busy}
        loadingText="Enviando…"
        onClick={upload}
        type="button"
      >
        <Upload aria-hidden="true" />
        {blockId ? 'Trocar material' : 'Enviar material'}
      </Button>
    </div>
  );
}
