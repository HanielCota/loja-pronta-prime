import { logoConfigSchema, logoTemplates, type LogoConfig } from '../logo/config';
import { loadLogoFonts } from '../logo/fonts.server';
import { renderLogoSvg } from '../logo/render';
import { getOwnBrandForImage } from './brand';

/** Logo da URL da prévia (os nomes curtos de logoPreviewSrc). */
function logoFromSearchParams(params: URLSearchParams): LogoConfig | undefined {
  if (!params.has('l')) return undefined;
  const parsed = logoConfigSchema.safeParse({
    template: Number(params.get('t')),
    layout: params.get('l'),
    font: params.get('f'),
    color: params.get('c'),
    icon: params.get('i') === 'nenhum' ? null : params.get('i'),
    background: params.get('b'),
  });
  return parsed.success ? parsed.data : undefined;
}

/**
 * O logo dela em SVG: o da URL (prévia do estúdio e dos modelos), ou o salvo. O nome é sempre o
 * da marca dela (nunca vem da URL). Sem acesso ou sem logo: nada.
 */
export async function ownLogoSvg(
  params: URLSearchParams,
): Promise<{ svg: string; name: string } | undefined> {
  const own = await getOwnBrandForImage();
  if (!own) return undefined;
  const config = logoFromSearchParams(params) ?? own.brand.logo ?? logoTemplates(own.answers)[0];
  if (!config) return undefined;
  const name =
    own.brand.name ?? (typeof own.answers.nome === 'string' ? own.answers.nome : 'Sua loja');
  return { svg: renderLogoSvg(config, name, await loadLogoFonts()), name };
}
