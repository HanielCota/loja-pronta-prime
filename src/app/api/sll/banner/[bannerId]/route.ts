import { and, eq, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireProduct } from '@/features/products/server/access';
import { storageKeyVersion, VERSIONED_PRIVATE_IMAGE_CACHE } from '@/lib/storage-version';
import { db } from '@/server/db';
import { learningBanners } from '@/server/db/schema';
import { storage } from '@/server/storage';

export async function GET(request: Request, { params }: { params: Promise<{ bannerId: string }> }) {
  await requireProduct('sll');
  const { bannerId } = await params;
  const id = z.uuid().safeParse(bannerId);
  if (!id.success) return new NextResponse(null, { status: 404 });
  const banner = await db.query.learningBanners.findFirst({
    columns: { imageStorageKey: true },
    where: and(
      eq(learningBanners.id, id.data),
      eq(learningBanners.status, 'published'),
      isNull(learningBanners.archivedAt),
    ),
  });
  if (!banner?.imageStorageKey) return new NextResponse(null, { status: 404 });
  const bytes = await storage().get(banner.imageStorageKey);
  if (!bytes) return new NextResponse(null, { status: 404 });
  // Com a versão do arquivo no endereço, outra imagem publicada muda a URL: pode guardar de vez.
  // Sem ela (endereço antigo), mantém o cache curto de antes.
  const versioned =
    new URL(request.url).searchParams.get('v') === storageKeyVersion(banner.imageStorageKey);
  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': versioned ? VERSIONED_PRIVATE_IMAGE_CACHE : 'private, max-age=300',
    },
  });
}
