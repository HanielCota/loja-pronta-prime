import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/features/admin/server/access';
import { db } from '@/server/db';
import { storeBrand } from '@/server/db/schema';
import { storage } from '@/server/storage';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(`/admin/contas/${encodeURIComponent(id)}/journey`);
  const brand = await db.query.storeBrand.findFirst({
    columns: { logoImage: true },
    where: eq(storeBrand.userId, id),
  });
  const png = brand?.logoImage ? await storage().get(brand.logoImage) : null;
  if (!png) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
