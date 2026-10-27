import { createHash } from 'node:crypto';
import { db } from '@/server/db';
import { storage } from '@/server/storage';
import { getActiveSession, needsFirstPassword } from '@/features/auth/server/session';
import { getStudentProducts } from '@/features/products/server/access';
import { recoveredProduct } from '@/features/legacy-stores/server/catalog-data';
import { recoveredImageKey, recoveredProductImages } from '@/features/legacy-stores/catalog-import';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  const session = await getActiveSession();
  if (
    !session ||
    needsFirstPassword(session.user) ||
    !(await getStudentProducts(session.user.id)).products.includes('loja-pronta')
  )
    return new Response('Não encontrado', { status: 404 });
  const { id, index } = await params;
  if (!/^\d{1,3}$/.test(index)) return new Response('Não encontrado', { status: 404 });
  const product = await recoveredProduct(db.$client, session.user.id, id);
  const asset = product ? recoveredProductImages(product)[Number(index)] : undefined;
  const key = asset && recoveredImageKey(asset);
  if (!key || !asset) return new Response('Não encontrado', { status: 404 });
  const bytes = await storage().get(key);
  if (!bytes || createHash('sha256').update(bytes).digest('hex') !== asset.sha256)
    return new Response('Imagem indisponível', { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': asset.contentType,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
