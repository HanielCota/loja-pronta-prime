import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getSessionState, needsFirstPassword } from '@/features/auth/server/session';
import { hasAdminRole } from '@/features/admin/access';
import { getStudentProducts } from '@/features/products/server/access';
import { db } from '@/server/db';
import { learningContentBlocks } from '@/server/db/schema';
import { storage } from '@/server/storage';

type RouteContext = { params: Promise<{ blockId: string }> };

/** Só administrações e alunas do SLL podem ler materiais publicados da trilha. */
export async function GET(_request: Request, context: RouteContext) {
  const { blockId } = await context.params;
  if (!z.uuid().safeParse(blockId).success) {
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  const state = await getSessionState();
  if (state.status !== 'active' || needsFirstPassword(state.session.user)) {
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  const admin = hasAdminRole(state.session.user.role);
  const products = admin ? null : await getStudentProducts(state.session.user.id);
  if (!admin && !products?.products.includes('sll')) {
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  const block = await db.query.learningContentBlocks.findFirst({
    columns: { kind: true, data: true },
    where: eq(learningContentBlocks.id, blockId),
    with: {
      lesson: {
        columns: { status: true, archivedAt: true },
        with: {
          module: {
            columns: { status: true, archivedAt: true },
            with: {
              stage: {
                columns: { status: true, archivedAt: true },
                with: { track: { columns: { status: true, archivedAt: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!block || (block.kind !== 'image' && block.kind !== 'file'))
    return new Response(null, { status: 404 });

  const published =
    block.lesson.archivedAt === null &&
    block.lesson.module.archivedAt === null &&
    block.lesson.module.stage.archivedAt === null &&
    block.lesson.module.stage.track.archivedAt === null &&
    block.lesson.status === 'published' &&
    block.lesson.module.status === 'published' &&
    block.lesson.module.stage.status === 'published' &&
    block.lesson.module.stage.track.status === 'published';
  const archived =
    block.lesson.archivedAt !== null ||
    block.lesson.module.archivedAt !== null ||
    block.lesson.module.stage.archivedAt !== null ||
    block.lesson.module.stage.track.archivedAt !== null;
  if (archived)
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  if (!admin && !published)
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });

  const data = block.data as Record<string, unknown>;
  if (typeof data.storageKey !== 'string') return new Response(null, { status: 404 });
  const bytes = await storage().get(data.storageKey);
  if (!bytes) return new Response(null, { status: 404 });

  if (block.kind === 'image') {
    return new Response(bytes.buffer as ArrayBuffer, {
      headers: {
        'Content-Type':
          data.contentType === 'image/webp' ? 'image/webp' : 'application/octet-stream',
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
      },
    });
  }

  const fileName = typeof data.fileName === 'string' ? data.fileName : 'material';
  const contentType =
    typeof data.contentType === 'string' ? data.contentType : 'application/octet-stream';
  return new Response(bytes.buffer as ArrayBuffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
