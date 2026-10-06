import { and, eq, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireProduct } from '@/features/products/server/access';
import { db } from '@/server/db';
import { learningBanners } from '@/server/db/schema';
import { storage } from '@/server/storage';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bannerId: string }> },
) {
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
  return new Response(Buffer.from(bytes), {
    headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=300' },
  });
}
