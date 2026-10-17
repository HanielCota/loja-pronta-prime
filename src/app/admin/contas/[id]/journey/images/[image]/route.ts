import { requireAdmin } from '@/features/admin/server/access';
import { getLogoStudio } from '@/features/brand/logo-studio/server/studio-store';
import { storage } from '@/server/storage';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; image: string }> },
) {
  const { id, image } = await params;
  await requireAdmin(`/admin/contas/${encodeURIComponent(id)}/journey`);
  if (!/^(0|[1-9]\d?)$/.test(image)) return new Response('Not found', { status: 404 });
  const studio = await getLogoStudio(id);
  const saved = studio.logos[Number(image)];
  const png = saved ? await storage().get(saved.key) : null;
  if (!png) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
