import { and, asc, eq, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { z } from 'zod';
import { getSessionState, needsFirstPassword } from '@/features/auth/server/session';
import { hasAdminRole } from '@/features/admin/access';
import { validateDownloadFile } from '@/features/admin/media-validation';
import { db } from '@/server/db';
import {
  learningContentBlocks,
  learningLessons,
  type LearningDraftBlock,
} from '@/server/db/schema';
import { storage } from '@/server/storage';
import { hasTrustedOrigin } from '@/server/request/origin';
import {
  getEditableLessonBlocks,
  LearningContentChangedError,
  saveNodeDraft,
  withNodeDraftLock,
} from '@/features/admin/server/node-drafts';
import { removeStorageKeyIfUnused } from '@/features/admin/server/storage-references';
import { readLimitedFormData, RequestBodyTooLargeError } from '@/lib/request-body';

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
  if (!hasTrustedOrigin(request)) return jsonError('Pedido inválido.', 403);

  let form: FormData;
  try {
    form = await readLimitedFormData(request, MAX_UPLOAD_BYTES + 64 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError)
      return jsonError('O arquivo é grande demais. O limite é 20 MB.', 413);
    return jsonError('Não consegui ler o arquivo. Tente escolher de novo.', 400);
  }

  const lessonId = lessonIdSchema.safeParse(form.get('lessonId'));
  const kind = form.get('kind');
  const alt = z.string().trim().min(1).max(300).safeParse(form.get('alt'));
  const replaceId = form.get('replaceBlockId');
  const attachToBlockId = form.get('attachToBlockId');
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
    columns: { id: true, status: true },
    where: and(eq(learningLessons.id, lessonId.data), isNull(learningLessons.archivedAt)),
  });
  if (!lesson) return jsonError('Esta aula não está disponível.', 404);
  const draftBlocks =
    lesson.status === 'published' ? await getEditableLessonBlocks(lesson.id) : null;

  let attachedTo: string | undefined;
  if (kind === 'file' && typeof attachToBlockId === 'string' && attachToBlockId) {
    const targetId = lessonIdSchema.safeParse(attachToBlockId);
    if (!targetId.success) return jsonError('Escolha um vídeo ou link desta aula.', 400);
    const target =
      draftBlocks?.find((item) => item.id === targetId.data) ??
      (await db.query.learningContentBlocks.findFirst({
        columns: { id: true, kind: true },
        where: and(
          eq(learningContentBlocks.id, targetId.data),
          eq(learningContentBlocks.lessonId, lesson.id),
        ),
      }));
    if (!target || (target.kind !== 'link' && target.kind !== 'video')) {
      return jsonError('Escolha um vídeo ou link desta aula.', 400);
    }
    attachedTo = target.id;
  }

  let replacing: { id: string; data: Record<string, unknown>; position: number } | undefined;
  if (typeof replaceId === 'string' && replaceId) {
    const replaceUuid = lessonIdSchema.safeParse(replaceId);
    if (!replaceUuid.success) return jsonError('Este material não está disponível.', 404);
    const block =
      draftBlocks?.find((item) => item.id === replaceUuid.data) ??
      (await db.query.learningContentBlocks.findFirst({
        columns: { id: true, kind: true, data: true, position: true },
        where: and(
          eq(learningContentBlocks.id, replaceUuid.data),
          eq(learningContentBlocks.lessonId, lesson.id),
        ),
      }));
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

    const result = await withNodeDraftLock('lesson', lesson.id, async (tx) => {
      // O envio ao bucket demora: o estado de publicação e os materiais podem ter mudado.
      const [currentLesson] = await tx
        .select({ status: learningLessons.status })
        .from(learningLessons)
        .where(and(eq(learningLessons.id, lesson.id), isNull(learningLessons.archivedAt)))
        .for('update');
      if (!currentLesson) throw new LearningContentChangedError();
      const current =
        currentLesson.status === 'published'
          ? await getEditableLessonBlocks(lesson.id, tx)
          : await tx.query.learningContentBlocks.findMany({
              columns: { id: true, kind: true, data: true, position: true },
              where: eq(learningContentBlocks.lessonId, lesson.id),
              orderBy: [asc(learningContentBlocks.position), asc(learningContentBlocks.id)],
            });
      const existing = replacing ? current.find((block) => block.id === replacing.id) : undefined;
      if (replacing && existing?.kind !== kind) throw new LearningContentChangedError();
      const existingData = (existing?.data ?? {}) as Record<string, unknown>;
      const keepAttachedTo =
        typeof existingData.attachedTo === 'string' ? existingData.attachedTo : attachedTo;
      if (
        keepAttachedTo &&
        !current.some(
          (block) =>
            block.id === keepAttachedTo && (block.kind === 'link' || block.kind === 'video'),
        )
      )
        throw new LearningContentChangedError();
      const data =
        kind === 'image'
          ? { storageKey: key, contentType, size: bytes.length, alt: altText! }
          : {
              storageKey: key,
              contentType,
              size: bytes.length,
              fileName,
              ...(keepAttachedTo ? { attachedTo: keepAttachedTo } : {}),
            };
      const blockId = existing?.id ?? crypto.randomUUID();
      const position = Math.max(-1, ...current.map((block) => block.position)) + 1;
      if (currentLesson.status === 'published') {
        const blocks: LearningDraftBlock[] = existing
          ? current.map((block) => (block.id === existing.id ? { ...block, data } : block))
          : [...current, { id: blockId, kind, data, position }];
        await saveNodeDraft('lesson', lesson.id, { blocks }, tx);
      } else if (existing) {
        await tx
          .update(learningContentBlocks)
          .set({ data })
          .where(
            and(
              eq(learningContentBlocks.id, blockId),
              eq(learningContentBlocks.lessonId, lesson.id),
            ),
          );
      } else {
        await tx
          .insert(learningContentBlocks)
          .values({ id: blockId, lessonId: lesson.id, kind, data, position });
      }
      return {
        blockId,
        previousKey:
          typeof existingData.storageKey === 'string' ? existingData.storageKey : undefined,
      };
    });
    // O arquivo da versão publicada ou anterior continua disponível para restauração.
    if (result.previousKey !== key)
      await removeStorageKeyIfUnused(result.previousKey, 'learning-media');
    return NextResponse.json(
      { id: result.blockId, fileName, alt: kind === 'image' ? altText : undefined },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (saved) await removeStorageKeyIfUnused(key, 'learning-media');
    if (error instanceof LearningContentChangedError)
      return jsonError('Os materiais mudaram. Atualize a aula e tente de novo.', 409);
    console.error(`[learning-media] envio falhou: ${error instanceof Error ? error.name : 'erro'}`);
    return jsonError('Não consegui guardar o material agora. Tente de novo.', 500);
  }
}
