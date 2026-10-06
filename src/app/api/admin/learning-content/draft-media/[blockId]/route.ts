import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getSessionState, needsFirstPassword } from '@/features/auth/server/session';
import { hasAdminRole } from '@/features/admin/access';
import { db } from '@/server/db';
import { learningContentBlocks, learningNodeDrafts } from '@/server/db/schema';
import { storage } from '@/server/storage';

type RouteContext = { params: Promise<{ blockId: string }> };

/** A prévia da administradora pode ler arquivos salvos em rascunho sem expô-los às alunas. */
export async function GET(_request: Request, context: RouteContext) {
  const { blockId } = await context.params;
  if (!z.uuid().safeParse(blockId).success) return new Response(null, { status: 404 });
  const state = await getSessionState();
  if (
    state.status !== 'active' ||
    needsFirstPassword(state.session.user) ||
    !hasAdminRole(state.session.user.role)
  )
    return new Response(null, { status: 404 });

  const draft = await db.query.learningNodeDrafts.findFirst({
    columns: { data: true },
    where: sql`${learningNodeDrafts.kind} = 'lesson' and ${learningNodeDrafts.data}->'blocks' @> ${JSON.stringify([{ id: blockId }])}::jsonb`,
  });
  const draftBlock = draft?.data.blocks?.find((block) => block.id === blockId);
  const block =
    draftBlock ??
    (await db.query.learningContentBlocks.findFirst({
      columns: { kind: true, data: true },
      where: eq(learningContentBlocks.id, blockId),
    }));
  if (!block || (block.kind !== 'file' && block.kind !== 'image'))
    return new Response(null, { status: 404 });
  const data = block.data as Record<string, unknown>;
  if (typeof data.storageKey !== 'string') return new Response(null, { status: 404 });
  const bytes = await storage().get(data.storageKey);
  if (!bytes) return new Response(null, { status: 404 });
  const contentType =
    block.kind === 'image'
      ? 'image/webp'
      : typeof data.contentType === 'string'
        ? data.contentType
        : 'application/octet-stream';
  const fileName = typeof data.fileName === 'string' ? data.fileName : 'material';
  return new Response(bytes.buffer as ArrayBuffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition':
        block.kind === 'image'
          ? 'inline'
          : `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
