'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ImagePlus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import { panelCard } from '@/features/member/components/area-shell';
import { archiveSllBannerForm, moveSllBannerForm, saveSllBannerForm } from '../server/actions';
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
};

const initialState: BannerActionState = { message: '', saved: false };

export function SllBannerEditor({ banner, isLast }: { banner?: Banner; isLast?: boolean }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveSllBannerForm, initialState);
  const bannerId = banner?.id ?? '';
  const currentBannerId = state.bannerId ?? bannerId;
  const [hasImage, setHasImage] = useState(banner?.hasImage ?? false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  useEffect(() => {
    if (!state.saved) return;
    router.refresh();
  }, [router, state.saved]);

  async function uploadImage() {
    if (!currentBannerId) {
      setUploadMessage('Salve o banner antes de enviar a imagem.');
      return;
    }
    if (!file) {
      setUploadMessage('Escolha uma imagem primeiro.');
      return;
    }
    const form = new FormData();
    form.set('file', file);
    form.set(
      'alt',
      (document.getElementById(`banner-alt-${currentBannerId}`) as HTMLInputElement | null)
        ?.value ?? '',
    );
    setUploading(true);
    setUploadMessage('');
    try {
      const response = await fetch(`/api/admin/sll-banners/${currentBannerId}/media`, {
        method: 'POST',
        body: form,
      });
      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      setUploadMessage(result?.message ?? 'Não consegui guardar a imagem.');
      if (response.ok) {
        setHasImage(true);
        setFile(null);
        router.refresh();
      }
    } catch {
      setUploadMessage('Confira a internet e tente enviar a imagem de novo.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <article className={`${panelCard} gap-4`}>
      {currentBannerId && hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={banner?.imageAlt ?? ''}
          className="aspect-[2/1] w-full rounded-2xl object-cover"
          src={`/api/admin/sll-banners/${currentBannerId}/media`}
        />
      ) : (
        <div className="flex aspect-[2/1] items-center justify-center rounded-2xl bg-muted text-body text-muted-foreground">
          Imagem do banner ainda não enviada
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        {currentBannerId ? <input name="id" type="hidden" value={currentBannerId} /> : null}
        <FloatingLabelInput
          defaultValue={banner?.label ?? ''}
          id={`banner-label-${bannerId || 'new'}`}
          label="Etiqueta (opcional)"
          maxLength={80}
          name="label"
        />
        <FloatingLabelInput
          defaultValue={banner?.title ?? ''}
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
            defaultValue={banner?.description ?? ''}
            id={`banner-description-${bannerId || 'new'}`}
            maxLength={600}
            name="description"
            required
          />
        </div>
        <FloatingLabelInput
          defaultValue={banner?.buttonLabel ?? ''}
          id={`banner-button-${bannerId || 'new'}`}
          label="Texto do botão"
          maxLength={80}
          name="buttonLabel"
          required
        />
        <FloatingLabelInput
          defaultValue={banner?.destination ?? ''}
          id={`banner-destination-${bannerId || 'new'}`}
          label="Destino (rota ou link https://)"
          maxLength={500}
          name="destination"
          required
        />
        <FloatingLabelInput
          defaultValue={banner?.position ?? 0}
          id={`banner-position-${bannerId || 'new'}`}
          label="Ordem (começa em 0)"
          max={999}
          min={0}
          name="position"
          type="number"
          required
        />
        <FloatingLabelInput
          defaultValue={banner?.imageAlt ?? ''}
          id={`banner-alt-${bannerId || 'new'}`}
          label="Descrição da imagem"
          maxLength={300}
          name="imageAlt"
        />
        <label className="flex min-h-11 items-center gap-3 text-body text-foreground">
          <input
            defaultChecked={banner?.status === 'published'}
            name="published"
            type="checkbox"
            value="true"
          />
          Exibir para as alunas
        </label>
        {state.message ? (
          <p
            aria-live="polite"
            className={state.saved ? 'text-body text-foreground' : 'text-body text-destructive'}
            role={state.saved ? 'status' : 'alert'}
          >
            {state.message}
          </p>
        ) : null}
        <Button loading={pending} loadingText="Salvando…" type="submit">
          <Save aria-hidden="true" />
          Salvar informações
        </Button>
      </form>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <Label htmlFor={`banner-file-${bannerId || 'new'}`}>Imagem do banner</Label>
        <input
          accept="image/png,image/jpeg,image/webp"
          className="min-h-11 w-full text-body text-foreground file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-primary-soft file:px-4 file:text-body file:font-medium file:text-link"
          disabled={!bannerId}
          id={`banner-file-${bannerId || 'new'}`}
          onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
          type="file"
        />
        <Button
          disabled={!bannerId || !file}
          loading={uploading}
          loadingText="Enviando…"
          onClick={uploadImage}
          type="button"
          variant="soft"
        >
          <ImagePlus aria-hidden="true" />
          Enviar imagem
        </Button>
        {uploadMessage ? (
          <p aria-live="polite" className="text-body text-muted-foreground">
            {uploadMessage}
          </p>
        ) : null}
      </div>

      {banner ? (
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <form action={moveSllBannerForm}>
            <input name="id" type="hidden" value={banner.id} />
            <input name="direction" type="hidden" value="up" />
            <Button
              aria-label="Mover banner para cima"
              disabled={banner.position <= 0}
              size="icon"
              type="submit"
              variant="soft"
            >
              <ArrowUp aria-hidden="true" />
            </Button>
          </form>
          <form action={moveSllBannerForm}>
            <input name="id" type="hidden" value={banner.id} />
            <input name="direction" type="hidden" value="down" />
            <Button
              aria-label="Mover banner para baixo"
              disabled={isLast}
              size="icon"
              type="submit"
              variant="soft"
            >
              <ArrowDown aria-hidden="true" />
            </Button>
          </form>
          <form action={archiveSllBannerForm}>
            <input name="id" type="hidden" value={banner.id} />
            <Button type="submit" variant="soft">
              <Trash2 aria-hidden="true" />
              Arquivar banner
            </Button>
          </form>
        </div>
      ) : null}
    </article>
  );
}
