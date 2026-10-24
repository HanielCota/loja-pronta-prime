import { requireAdmin } from '@/features/admin/server/access';
import { isStoreLogoKey } from '@/features/admin/store-images';
import { getLogoStudio } from '@/features/brand/logo-studio/server/studio-store';
import { storage } from '@/server/storage';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; image: string }> },
) {
  const { id, image } = await params;
  await requireAdmin(`/admin/contas/${encodeURIComponent(id)}/etapa`);
  if (!/^(0|[1-9]\d?)$/.test(image)) return new Response('Imagem não encontrada', { status: 404 });
  const studio = await getLogoStudio(id);
  const saved = studio.logos.filter((logo) => isStoreLogoKey(id, logo.key))[Number(image)];
  const png = saved ? await storage().get(saved.key) : null;
  if (!png) return new Response('Imagem não encontrada', { status: 404 });
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
