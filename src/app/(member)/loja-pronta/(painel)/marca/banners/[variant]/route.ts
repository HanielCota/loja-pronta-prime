import { getOwnBrandForImage } from '@/features/brand/server/brand';
import { brandFingerprint } from '@/features/brand/server/fingerprint';
import { readBannerKit } from '@/features/brand/banner-kit/server/kit';
import { readBannerImage } from '@/features/brand/banner-kit/server/images';
import {
  bannerVariants,
  kitIsApproved,
  type BannerVariant,
} from '@/features/brand/banner-kit/model';

export async function GET(request: Request, context: { params: Promise<{ variant: string }> }) {
  const { variant } = await context.params;
  const kind = variant.replace(/\.png$/, '') as BannerVariant;
  if (!bannerVariants.includes(kind) || variant !== `${kind}.png`)
    return new Response('Não encontrado', { status: 404 });
  const owner = await getOwnBrandForImage();
  if (!owner?.brand.completedAt || !owner.brand.logoImage || !owner.brand.name)
    return new Response('Não encontrado', { status: 404 });
  const kit = await readBannerKit(owner.userId);
  const params = new URL(request.url).searchParams;
  const fingerprint = brandFingerprint(owner.brand);
  if (!kit || kit.brandFingerprint !== fingerprint || params.get('v') !== kit.revision)
    return new Response('O kit mudou. Abra a prévia novamente.', { status: 409 });
  const download = params.get('baixar') === '1';
  if (download && !kitIsApproved(kit, fingerprint))
    return new Response('Aprove esta versão antes de baixar.', { status: 403 });
  try {
    const png = await readBannerImage({
      userId: owner.userId,
      revision: kit.revision,
      fingerprint,
      variant: kind,
      draft: kit,
      name: owner.brand.name,
      logoKey: owner.brand.logoImage,
    });
    if (!png) return new Response('Logo indisponível', { status: 404 });
    return new Response(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        ...(download ? { 'Content-Disposition': `attachment; filename="banner-${kind}.png"` } : {}),
      },
    });
  } catch {
    return new Response('Não foi possível preparar o banner. Tente novamente.', { status: 503 });
  }
}
