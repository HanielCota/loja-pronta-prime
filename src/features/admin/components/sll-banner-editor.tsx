'use client';

import { useActionState, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiveRegion } from '@/components/ui/live-region';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import { panelCard } from '@/features/member/components/area-shell';
import { saveSllBannerForm } from '../server/actions';
import type { BannerActionState } from '../structure-types';

type Banner = {
  id: string;
  label: string | null;
  title: string;
  description: string;
  buttonLabel: string;
  destination: string;
  imageAlt: string | null;
  position: number;
  status: 'draft' | 'published';
  hasImage: boolean;
  draft?: {
    label?: string | null;
    title?: string;
    description?: string | null;
    buttonLabel?: string | null;
    destination?: string | null;
    imageAlt?: string | null;
    imageStorageKey?: string | null;
  } | null;
  hasHistory?: boolean;
};

const initialState: BannerActionState = { message: '', saved: false };

export function SllBannerEditor({
  banner,
  isFirst,
  isLast,
  action,
  actionPending = false,
}: {
  banner?: Banner;
  isFirst?: boolean;
  isLast?: boolean;
  /** Publicar, descartar, voltar, mover e arquivar: o estado fica na lista, que não recarrega. */
  action?: (form: FormData) => void;
  actionPending?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveSllBannerForm, initialState);
  // O cartão de banner novo não adota o banner que acabou de criar: depois do refresh ele
  // aparece na lista acima (onde recebe a imagem) e este cartão volta a criar outro.
  const bannerId = banner?.id ?? '';
  const [createdId, setCreatedId] = useState('');
  const currentBannerId = createdId || state.bannerId || bannerId;
  const [hasImage, setHasImage] = useState(banner?.hasImage ?? false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const initial = {
    label: banner?.draft?.label ?? banner?.label ?? '',
    title: banner?.draft?.title ?? banner?.title ?? '',
    description: banner?.draft?.description ?? banner?.description ?? '',
    buttonLabel: banner?.draft?.buttonLabel ?? banner?.buttonLabel ?? '',
    destination: banner?.draft?.destination ?? banner?.destination ?? '',
    imageAlt: banner?.draft?.imageAlt ?? banner?.imageAlt ?? '',
  };
  const [preview, setPreview] = useState(initial);
  const [dirty, setDirty] = useState(false);
  // Cada resposta é um objeto novo: assim a segunda gravação seguida também limpa o aviso de
  // "alterações não salvas" (um efeito em `state.saved` não rodaria de novo).
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    if (state.saved) setDirty(false);
  }
  // A publicação usa a descrição salva, não a digitada: sem ela, o botão fica desligado e diz
  // o que falta, em vez de não fazer nada.
  const savedImageAlt =
    banner?.draft?.imageAlt !== undefined ? banner.draft.imageAlt : banner?.imageAlt;
  const publishBlocker = !hasImage
    ? 'Envie a imagem do banner para poder publicar.'
    : !savedImageAlt
      ? 'Escreva a descrição da imagem e salve para poder publicar.'
      : '';
  function updatePreview(event: FormEvent<HTMLFormElement>) {
    const values = new FormData(event.currentTarget);
    setPreview({
      label: String(values.get('label') ?? ''),
      title: String(values.get('title') ?? ''),
      description: String(values.get('description') ?? ''),
      buttonLabel: String(values.get('buttonLabel') ?? ''),
      destination: String(values.get('destination') ?? ''),
      imageAlt: String(values.get('imageAlt') ?? ''),
    });
    setDirty(true);
  }

  async function saveWithImage(event: React.FormEvent<HTMLFormElement>) {
    if (!file) return;
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setUploading(true);
    setUploadMessage('');
    try {
      const saved = await saveSllBannerForm(initialState, values);
      if (!saved.saved || !saved.bannerId) {
        setUploadMessage(saved.message);
        return;
      }
      setCreatedId(saved.bannerId);
      setDirty(false);
      const image = new FormData();
      image.set('file', file);
      image.set('alt', String(values.get('imageAlt') ?? ''));
      const response = await fetch(`/api/admin/sll-banners/${saved.bannerId}/media`, {
        method: 'POST',
        body: image,
      });
      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setUploadMessage(
          result?.message ?? 'As informações foram salvas, mas a imagem não foi enviada.',
        );
        return;
      }
      setHasImage(true);
      setFile(null);
      setDirty(false);
      setUploadMessage('Banner e imagem salvos.');
      router.refresh();
    } catch {
      setUploadMessage('Confira a internet e tente salvar de novo.');
    } finally {
      setUploading(false);
    }
  }

  const editor = (
    <>
      {currentBannerId && hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={preview.imageAlt}
          className="aspect-[2/1] w-full rounded-2xl object-cover"
          src={`/api/admin/sll-banners/${currentBannerId}/media`}
        />
      ) : banner ? (
        <div className="flex aspect-[2/1] items-center justify-center rounded-2xl bg-muted text-body text-muted-foreground">
          Imagem do banner ainda não enviada
        </div>
      ) : null}

      <form
        action={formAction}
        className="flex flex-col gap-4"
        onChange={updatePreview}
        onInput={updatePreview}
        onSubmit={saveWithImage}
      >
        {currentBannerId ? <input name="id" type="hidden" value={currentBannerId} /> : null}
        <FloatingLabelInput
          defaultValue={initial.label}
          id={`banner-label-${bannerId || 'new'}`}
          label="Etiqueta (opcional)"
          maxLength={80}
          name="label"
        />
        <FloatingLabelInput
          defaultValue={initial.title}
          id={`banner-title-${bannerId || 'new'}`}
          label="Título do banner"
          maxLength={160}
          name="title"
          required
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor={`banner-description-${bannerId || 'new'}`}>Texto do banner</Label>
          <textarea
            className="min-h-24 w-full rounded-field border border-input bg-background px-4 py-3 text-body text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            defaultValue={initial.description}
            id={`banner-description-${bannerId || 'new'}`}
            maxLength={600}
            name="description"
            required
          />
        </div>
        <FloatingLabelInput
          defaultValue={initial.buttonLabel}
          id={`banner-button-${bannerId || 'new'}`}
          label="Texto do botão"
          maxLength={80}
          name="buttonLabel"
          required
        />
        <FloatingLabelInput
          defaultValue={initial.destination}
          id={`banner-destination-${bannerId || 'new'}`}
          label="Destino (rota ou link https://)"
          maxLength={500}
          name="destination"
          required
        />
        <input name="position" type="hidden" value={banner?.position ?? 999} />
        <FloatingLabelInput
          defaultValue={initial.imageAlt}
          id={`banner-alt-${bannerId || 'new'}`}
          label="Descrição da imagem"
          maxLength={300}
          name="imageAlt"
          // Com imagem, a descrição é obrigatória: o banner não pode ser publicado sem ela.
          required={hasImage || Boolean(file)}
        />
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <Label htmlFor={`banner-file-${bannerId || 'new'}`}>Imagem do banner</Label>
          <input
            accept="image/png,image/jpeg,image/webp"
            className="min-h-11 w-full rounded-field text-body text-foreground outline-none file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-primary-soft file:px-4 file:text-body file:font-medium file:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            id={`banner-file-${bannerId || 'new'}`}
            onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
            type="file"
          />
          <p className="text-body text-muted-foreground">PNG, JPG ou WebP. Até 20 MB.</p>
        </div>
        {state.message ? (
          <p
            className={state.saved ? 'text-body text-foreground' : 'text-body text-destructive'}
            role={state.saved ? undefined : 'alert'}
          >
            {state.message}
          </p>
        ) : null}
        {/* Sempre presente: regiões criadas junto com o texto costumam não ser anunciadas. */}
        <LiveRegion>{state.saved ? state.message : null}</LiveRegion>
        {uploadMessage ? <p className="text-body text-muted-foreground">{uploadMessage}</p> : null}
        <LiveRegion>{uploadMessage}</LiveRegion>
        <Button loading={pending || uploading} loadingText="Salvando…" type="submit">
          <Save aria-hidden="true" />
          {file ? 'Salvar rascunho e imagem' : 'Salvar rascunho'}
        </Button>
      </form>

      {banner && action ? (
        // Um formulário só: cada botão manda a ação em `intent`, e a resposta aparece abaixo do
        // editor. Funciona também sem JavaScript.
        <form
          action={action}
          aria-busy={actionPending}
          className="flex flex-col gap-3 border-t border-border pt-4"
        >
          <input name="id" type="hidden" value={banner.id} />
          <div className="flex flex-wrap gap-2">
            <Button
              className="!w-fit"
              aria-describedby={publishBlocker ? `banner-publish-hint-${banner.id}` : undefined}
              disabled={Boolean(publishBlocker) || (banner.status === 'published' && !banner.draft)}
              name="intent"
              type="submit"
              value="publish"
            >
              Publicar para alunas
            </Button>
            {banner.draft ? (
              <Button className="!w-fit" name="intent" type="submit" value="discard" variant="soft">
                Descartar rascunho
              </Button>
            ) : null}
            {banner.hasHistory && !banner.draft ? (
              <Button className="!w-fit" name="intent" type="submit" value="restore" variant="soft">
                Voltar à versão anterior
              </Button>
            ) : null}
            <Button
              aria-label="Mover banner para cima"
              disabled={isFirst}
              name="intent"
              size="icon"
              type="submit"
              value="up"
              variant="soft"
            >
              <ArrowUp aria-hidden="true" />
            </Button>
            <Button
              aria-label="Mover banner para baixo"
              disabled={isLast}
              name="intent"
              size="icon"
              type="submit"
              value="down"
              variant="soft"
            >
              <ArrowDown aria-hidden="true" />
            </Button>
            <Button className="!w-fit" name="intent" type="submit" value="archive" variant="soft">
              <Trash2 aria-hidden="true" />
              Arquivar banner
            </Button>
          </div>
          {publishBlocker ? (
            <p className="text-body text-muted-foreground" id={`banner-publish-hint-${banner.id}`}>
              {publishBlocker}
            </p>
          ) : null}
        </form>
      ) : null}
    </>
  );
  return (
    <article className={`${panelCard} gap-5`}>
      <div>
        <h3 className="text-title font-semibold text-foreground">
          {banner ? `Editar ${banner.title}` : 'Novo banner'}
        </h3>
        <p className="text-body text-muted-foreground">
          {banner?.status === 'published'
            ? 'O banner atual continua visível até você publicar as mudanças.'
            : 'Salve o banner e envie a imagem antes de publicar.'}
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="flex flex-col gap-4">{editor}</div>
        <section
          aria-label="Prévia para alunas"
          className="rounded-2xl border border-border bg-background p-5"
        >
          <p className="text-body font-semibold text-foreground">
            Prévia para alunas{' '}
            {dirty ? '· alterações não salvas' : banner?.draft ? '· rascunho salvo' : ''}
          </p>
          <div className="mt-4 overflow-hidden rounded-2xl bg-card shadow-card forced-colors:border forced-colors:border-[CanvasText]">
            {hasImage && currentBannerId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={preview.imageAlt}
                className="aspect-[2/1] w-full object-cover"
                src={`/api/admin/sll-banners/${currentBannerId}/media`}
              />
            ) : (
              <div className="flex aspect-[2/1] items-center justify-center bg-muted p-5 text-center text-body text-muted-foreground">
                Imagem do banner ainda não enviada
              </div>
            )}
            <div className="p-5">
              <p className="text-sm text-muted-foreground">{preview.label}</p>
              <h4 className="mt-2 text-title font-semibold text-foreground">
                {preview.title || 'Título do banner'}
              </h4>
              <p className="mt-2 text-body text-muted-foreground">
                {preview.description || 'O aviso aparece aqui.'}
              </p>
              <p className="mt-4 text-body font-semibold text-link">
                {preview.buttonLabel || 'Botão do banner'}
              </p>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}
