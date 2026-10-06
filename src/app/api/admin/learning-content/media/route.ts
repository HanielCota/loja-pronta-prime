import { and, desc, eq, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { z } from 'zod';
import { getSessionState, needsFirstPassword } from '@/features/auth/server/session';
import { hasAdminRole } from '@/features/admin/access';
import { validateDownloadFile } from '@/features/admin/media-validation';
import { db } from '@/server/db';
import { learningContentBlocks, learningLessons } from '@/server/db/schema';
import { storage } from '@/server/storage';

const lessonIdSchema = z.uuid();
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const IMAGE_TYPES = new Set(['png', 'jpeg', 'webp']);

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function hasAdminSession() {
  const state = await getSessionState();
  return (
    state.status === 'active' &&
    !needsFirstPassword(state.session.user) &&
    hasAdminRole(state.session.user.role)
  );
}

function safeFileName(value: string): string {
  return (
    (value.split(/[\\/]/).at(-1) ?? 'material')
      .split('')
      .filter((character) => {
        const code = character.charCodeAt(0);
        return code >= 32 && code !== 127;
      })
      .join('')
      .trim()
      .slice(0, 160) || 'material'
  );
}

/** Salva uma imagem ou documento e associa o arquivo à aula sem expor a chave do bucket. */
export async function POST(request: Request) {
  if (!(await hasAdminSession())) return jsonError('Entre com uma conta administradora.', 401);
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) return jsonError('Pedido inválido.', 403);

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_UPLOAD_BYTES + 64 * 1024) {
    return jsonError('O arquivo é grande demais. O limite é 20 MB.', 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError('Não consegui ler o arquivo. Tente escolher de novo.', 400);
  }

  const lessonId = lessonIdSchema.safeParse(form.get('lessonId'));
  const kind = form.get('kind');
  const alt = z.string().trim().min(1).max(300).safeParse(form.get('alt'));
  const replaceId = form.get('replaceBlockId');
  const file = form.get('file');
  if (!lessonId.success || (kind !== 'image' && kind !== 'file') || !(file instanceof File)) {
    return jsonError('Confira o tipo de material e tente de novo.', 400);
  }
  if (kind === 'image' && !alt.success)
    return jsonError('Descreva a imagem para quem não pode vê-la.', 400);
  const altText = alt.success ? alt.data : undefined;
  if (file.size === 0) return jsonError('O arquivo está vazio.', 400);
  if (file.size > MAX_UPLOAD_BYTES)
    return jsonError('O arquivo é grande demais. O limite é 20 MB.', 413);

  const lesson = await db.query.learningLessons.findFirst({
    columns: { id: true },
    where: and(eq(learningLessons.id, lessonId.data), isNull(learningLessons.archivedAt)),
  });
  if (!lesson) return jsonError('Esta aula não está disponível.', 404);

  let replacing: { id: string; data: Record<string, unknown>; position: number } | undefined;
  if (typeof replaceId === 'string' && replaceId) {
    const replaceUuid = lessonIdSchema.safeParse(replaceId);
    if (!replaceUuid.success) return jsonError('Este material não está disponível.', 404);
    const block = await db.query.learningContentBlocks.findFirst({
      columns: { id: true, kind: true, data: true, position: true },
      where: and(
        eq(learningContentBlocks.id, replaceUuid.data),
        eq(learningContentBlocks.lessonId, lesson.id),
      ),
    });
    if (!block || block.kind !== kind) return jsonError('Este material não está disponível.', 404);
    replacing = {
      id: block.id,
      data: block.data as Record<string, unknown>,
      position: block.position,
    };
  }

  const originalName = safeFileName(file.name);
  const originalBytes = new Uint8Array(await file.arrayBuffer());
  let bytes: Uint8Array;
  let contentType: string;
  let extension: string;
  if (kind === 'image') {
    try {
      const image = sharp(originalBytes, { limitInputPixels: 40_000_000 });
      const metadata = await image.metadata();
      if (!metadata.format || !IMAGE_TYPES.has(metadata.format)) {
        return jsonError('Mande uma imagem PNG, JPG ou WebP.', 400);
      }
      bytes = new Uint8Array(
        await image
          .rotate()
          .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 84 })
          .toBuffer(),
      );
      contentType = 'image/webp';
      extension = 'webp';
    } catch {
      return jsonError('Não consegui abrir essa imagem. Mande PNG, JPG ou WebP.', 400);
    }
  } else {
    const validated = validateDownloadFile(originalName, originalBytes);
    if (!validated) {
      return jsonError('Use PDF, ZIP, DOCX, XLSX, PPTX, TXT ou CSV.', 400);
    }
    bytes = originalBytes;
    contentType = validated.contentType;
    extension = validated.extension.slice(1);
  }

  const fileName = kind === 'image' ? `${originalName.replace(/\.[^.]+$/, '')}.webp` : originalName;
  const key = `sll/learning-content/${lesson.id}/${crypto.randomUUID()}.${extension}`;
  let saved = false;
  try {
    await storage().put(key, bytes, contentType);
    saved = true;

    if (replacing) {
      const data =
        kind === 'image'
          ? { ...replacing.data, storageKey: key, contentType, size: bytes.length, alt: altText! }
          : { ...replacing.data, storageKey: key, contentType, size: bytes.length, fileName };
      await db
        .update(learningContentBlocks)
        .set({ data })
        .where(
          and(
            eq(learningContentBlocks.id, replacing.id),
            eq(learningContentBlocks.lessonId, lesson.id),
          ),
        );
      const previousKey = replacing.data.storageKey;
      if (typeof previousKey === 'string' && previousKey !== key) {
        await storage()
          .remove(previousKey)
          .catch((error: unknown) => {
            console.error(
              `[learning-media] arquivo anterior não removido: ${error instanceof Error ? error.name : 'erro'}`,
            );
          });
      }
      return NextResponse.json(
        { id: replacing.id, fileName, alt: kind === 'image' ? altText : undefined },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const lastBlock = await db.query.learningContentBlocks.findFirst({
      columns: { position: true },
      where: eq(learningContentBlocks.lessonId, lesson.id),
      orderBy: [desc(learningContentBlocks.position)],
    });
    const position = (lastBlock?.position ?? -1) + 1;
    const [block] =
      kind === 'image'
        ? await db
            .insert(learningContentBlocks)
            .values({
              lessonId: lesson.id,
              kind: 'image',
              data: { storageKey: key, contentType, size: bytes.length, alt: altText! },
              position,
            })
            .returning({ id: learningContentBlocks.id })
        : await db
            .insert(learningContentBlocks)
            .values({
              lessonId: lesson.id,
              kind: 'file',
              data: { storageKey: key, contentType, size: bytes.length, fileName },
              position,
            })
            .returning({ id: learningContentBlocks.id });
    return NextResponse.json(
      { id: block!.id, fileName, alt: kind === 'image' ? altText : undefined },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (saved)
      await storage()
        .remove(key)
        .catch(() => {});
    console.error(`[learning-media] envio falhou: ${error instanceof Error ? error.name : 'erro'}`);
    return jsonError('Não consegui guardar o material agora. Tente de novo.', 500);
  }
}
