import { requireProduct } from '@/features/products/server/access';
import { getSllPublishedResources } from '@/features/sll/server/catalog';
import { TOOL_MATERIALS } from '@/features/sll/tools/catalog';
import { storage } from '@/server/storage';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  await requireProduct('sll');
  const { slug } = await params;
  const material = TOOL_MATERIALS.find((item) => item.slug === slug);
  if (!material)
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const resources = await getSllPublishedResources();
  if (!resources.some((resource) => resource.slug === 'materiais-sll' && resource.destination))
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const stored = await storage().stream(material.storageKey);
  if (!stored)
    return new Response('Este material não está disponível. Tente novamente mais tarde.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  return new Response(stored.body, {
    headers: {
      'Content-Type': material.contentType,
      ...(stored.length === undefined ? {} : { 'Content-Length': String(stored.length) }),
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(material.fileName)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
