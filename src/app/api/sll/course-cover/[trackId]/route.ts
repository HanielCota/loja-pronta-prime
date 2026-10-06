import { and, eq, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import sharp from 'sharp';
import { z } from 'zod';
import { hasAdminRole } from '@/features/admin/access';
import { getSessionState, needsFirstPassword } from '@/features/auth/server/session';
import { getStudentProducts } from '@/features/products/server/access';
import { db } from '@/server/db';
import { learningTracks } from '@/server/db/schema';
import { storage } from '@/server/storage';
import {
  getNodeDraft,
  getNodeDraftForUpdate,
  saveNodeDraft,
  withNodeDraftLock,
} from '@/features/admin/server/node-drafts';
import { removeStorageKeyIfUnused } from '@/features/admin/server/storage-references';

const MAX_BYTES = 20 * 1024 * 1024;
type Context = { params: Promise<{ trackId: string }> };

function error(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function access() {
  const state = await getSessionState();
  if (state.status !== 'active' || needsFirstPassword(state.session.user))
    return { admin: false, student: false };
  const admin = hasAdminRole(state.session.user.role);
  const student =
    admin || (await getStudentProducts(state.session.user.id)).products.includes('sll');
  return { admin, student };
}

async function courseFromParams(context: Context) {
  const id = z.uuid().safeParse((await context.params).trackId);
  if (!id.success) return null;
  return db.query.learningTracks.findFirst({
    columns: { id: true, kind: true, status: true, coverStorageKey: true, coverAlt: true },
    where: and(
      eq(learningTracks.id, id.data),
      eq(learningTracks.kind, 'complementary_course'),
      isNull(learningTracks.archivedAt),
    ),
  });
}

/**
 * Grava a capa nova (no rascunho, se o curso já está publicado) e devolve a chave da capa que
 * ela substituiu, para o arquivo antigo ser apagado se ninguém mais o usa.
 */
async function replaceCover(
  course: { id: string; status: string; coverStorageKey: string | null },
  values: { coverStorageKey: string | null; coverAlt: string | null },
) {
  if (course.status !== 'published') {
    await db.update(learningTracks).set(values).where(eq(learningTracks.id, course.id));
    return course.coverStorageKey;
  }
  return withNodeDraftLock('track', course.id, async (tx) => {
    const previousDraft = await getNodeDraftForUpdate(tx, 'track', course.id);
    await saveNodeDraft('track', course.id, values, tx);
    return previousDraft?.data.coverStorageKey;
  });
}

export async function GET(request: Request, context: Context) {
  const permission = await access();
  if (!permission.student) return error('Entre para ver este curso.', 401);
  const course = await courseFromParams(context);
  if (!course || (course.status !== 'published' && !permission.admin))
    return error('Este curso ainda não tem capa.', 404);
  const draft =
    permission.admin && new URL(request.url).searchParams.get('preview') === '1'
      ? await getNodeDraft('track', course.id)
      : null;
  const key =
    draft?.data.coverStorageKey === undefined ? course.coverStorageKey : draft.data.coverStorageKey;
  if (!key) return error('Este curso ainda não tem capa.', 404);
  const bytes = await storage().get(key);
  if (!bytes) return error('A capa não está disponível.', 404);
  return new Response(Buffer.from(bytes), {
    headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store' },
  });
}

export async function POST(request: Request, context: Context) {
  if (!(await access()).admin) return error('Entre com uma conta administradora.', 401);
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return error('Pedido inválido.', 403);
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BYTES + 64 * 1024)
    return error('A imagem é grande demais. O limite é 20 MB.', 413);
  const course = await courseFromParams(context);
  if (!course) return error('Este curso não está disponível.', 404);
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error('Não consegui ler a imagem.', 400);
  }
  const file = form.get('file');
  const alt = z.string().trim().min(1).max(300).safeParse(form.get('alt'));
  if (!(file instanceof File) || !alt.success)
    return error('Escolha a imagem e descreva o que ela mostra.', 400);
  if (file.size === 0 || file.size > MAX_BYTES) return error('Use uma imagem de até 20 MB.', 400);
  let bytes: Uint8Array;
  try {
    const image = sharp(new Uint8Array(await file.arrayBuffer()), { limitInputPixels: 40_000_000 });
    const metadata = await image.metadata();
    if (!metadata.format || !['png', 'jpeg', 'webp'].includes(metadata.format))
      return error('Use PNG, JPG ou WebP.', 400);
    bytes = new Uint8Array(
      await image
        .rotate()
        .resize({ width: 1600, height: 900, fit: 'cover', withoutEnlargement: true })
        .webp({ quality: 84 })
        .toBuffer(),
    );
  } catch {
    return error('Não consegui abrir a imagem.', 400);
  }
  const key = `sll/course-covers/${course.id}/${crypto.randomUUID()}.webp`;
  try {
    await storage().put(key, bytes, 'image/webp');
    const oldKey = await replaceCover(course, { coverStorageKey: key, coverAlt: alt.data });
    // A capa trocada sai do bucket só se nenhuma versão (publicada, rascunho ou anterior)
    // ainda a usa.
    if (oldKey !== key) await removeStorageKeyIfUnused(oldKey, 'course-cover');
    revalidatePath('/admin');
    revalidatePath('/sll/cursos');
    return NextResponse.json(
      { message: 'Capa salva.' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    await storage()
      .remove(key)
      .catch(() => {});
    return error('Não consegui guardar a imagem agora.', 500);
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!(await access()).admin) return error('Entre com uma conta administradora.', 401);
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return error('Pedido inválido.', 403);
  const course = await courseFromParams(context);
  if (!course) return error('Este curso não está disponível.', 404);
  const oldKey = await replaceCover(course, { coverStorageKey: null, coverAlt: null });
  await removeStorageKeyIfUnused(oldKey, 'course-cover');
  revalidatePath('/admin');
  revalidatePath('/sll/cursos');
  return NextResponse.json(
    { message: 'Capa removida.' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
