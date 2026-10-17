import { and, eq, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { z } from 'zod';
import { getSessionState, needsFirstPassword } from '@/features/auth/server/session';
import { hasAdminRole } from '@/features/admin/access';
import { db } from '@/server/db';
import { learningBanners } from '@/server/db/schema';
import { storage } from '@/server/storage';
import { hasTrustedOrigin } from '@/server/request/origin';
import {
  getNodeDraft,
  getNodeDraftForUpdate,
  LearningContentChangedError,
  saveNodeDraft,
  withNodeDraftLock,
} from '@/features/admin/server/node-drafts';
import { removeStorageKeyIfUnused } from '@/features/admin/server/storage-references';
import { readLimitedFormData, RequestBodyTooLargeError } from '@/lib/request-body';

const MAX_BYTES = 20 * 1024 * 1024;

async function isAdmin() {
  const state = await getSessionState();
  return (
    state.status === 'active' &&
    !needsFirstPassword(state.session.user) &&
    hasAdminRole(state.session.user.role)
  );
}

function error(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bannerId: string }> },
) {
  if (!(await isAdmin())) return error('Entre com uma conta administradora.', 401);
  const { bannerId } = await params;
  const id = z.uuid().safeParse(bannerId);
  if (!id.success) return error('Este banner não está disponível.', 404);
  const banner = await db.query.learningBanners.findFirst({
    columns: { imageStorageKey: true },
    where: and(eq(learningBanners.id, id.data), isNull(learningBanners.archivedAt)),
  });
  if (!banner) return error('Este banner não está disponível.', 404);
  const draft = await getNodeDraft('banner', id.data);
  const imageStorageKey = draft?.data.imageStorageKey ?? banner?.imageStorageKey;
  if (!imageStorageKey) return error('Este banner ainda não tem imagem.', 404);
  const bytes = await storage().get(imageStorageKey);
  if (!bytes) return error('A imagem não está disponível.', 404);
  return new Response(Buffer.from(bytes), {
    headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store' },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bannerId: string }> },
) {
  if (!(await isAdmin())) return error('Entre com uma conta administradora.', 401);
  if (!hasTrustedOrigin(request)) return error('Pedido inválido.', 403);
  const { bannerId } = await params;
  const id = z.uuid().safeParse(bannerId);
  if (!id.success) return error('Este banner não está disponível.', 404);
  let form: FormData;
  try {
    form = await readLimitedFormData(request, MAX_BYTES + 64 * 1024);
  } catch (cause) {
    if (cause instanceof RequestBodyTooLargeError)
      return error('O arquivo é grande demais. O limite é 20 MB.', 413);
    return error('Não consegui ler o arquivo. Tente escolher de novo.', 400);
  }
  const file = form.get('file');
  const alt = z.string().trim().min(1).max(300).safeParse(form.get('alt'));
  if (!(file instanceof File) || !alt.success)
    return error('Escolha a imagem e descreva o que ela mostra.', 400);
  if (file.size === 0) return error('O arquivo está vazio.', 400);
  if (file.size > MAX_BYTES) return error('O arquivo é grande demais. O limite é 20 MB.', 413);
  const banner = await db.query.learningBanners.findFirst({
    columns: { id: true, imageStorageKey: true, status: true },
    where: and(eq(learningBanners.id, id.data), isNull(learningBanners.archivedAt)),
  });
  if (!banner) return error('Este banner não está disponível.', 404);
  let bytes: Uint8Array;
  try {
    const image = sharp(new Uint8Array(await file.arrayBuffer()), { limitInputPixels: 40_000_000 });
    const metadata = await image.metadata();
    if (!metadata.format || !['png', 'jpeg', 'webp'].includes(metadata.format))
      return error('Mande uma imagem PNG, JPG ou WebP.', 400);
    bytes = new Uint8Array(
      await image
        .rotate()
        .resize({ width: 2400, height: 1200, fit: 'cover', withoutEnlargement: true })
        .webp({ quality: 84 })
        .toBuffer(),
    );
  } catch {
    return error('Não consegui abrir essa imagem. Mande PNG, JPG ou WebP.', 400);
  }
  const key = `sll/banners/${banner.id}/${crypto.randomUUID()}.webp`;
  try {
    await storage().put(key, bytes, 'image/webp');
    const oldKey = await withNodeDraftLock('banner', banner.id, async (tx) => {
      const [current] = await tx
        .select({
          status: learningBanners.status,
          imageStorageKey: learningBanners.imageStorageKey,
        })
        .from(learningBanners)
        .where(and(eq(learningBanners.id, banner.id), isNull(learningBanners.archivedAt)))
        .for('update');
      if (!current) throw new LearningContentChangedError();
      if (current.status === 'published') {
        const previousDraft = await getNodeDraftForUpdate(tx, 'banner', banner.id);
        await saveNodeDraft('banner', banner.id, { imageStorageKey: key, imageAlt: alt.data }, tx);
        return previousDraft?.data.imageStorageKey;
      }
      await tx
        .update(learningBanners)
        .set({ imageStorageKey: key, imageAlt: alt.data })
        .where(eq(learningBanners.id, banner.id));
      return current.imageStorageKey;
    });
    // A imagem trocada sai do bucket só se nenhuma versão (publicada, rascunho ou anterior)
    // ainda a usa.
    if (oldKey !== key) await removeStorageKeyIfUnused(oldKey, 'sll-banners');
    return NextResponse.json(
      { message: 'Imagem do banner salva.' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (cause) {
    await removeStorageKeyIfUnused(key, 'sll-banners');
    if (cause instanceof LearningContentChangedError)
      return error('O banner mudou. Atualize a página e tente de novo.', 409);
    return error('Não consegui guardar a imagem agora. Tente de novo.', 500);
  }
}
