/**
 * Letras da marca: fontes livres (licença OFL), do pacote @fontsource. A tela do nome mostra o
 * nome na letra do estilo que ela escolheu na conversa (a rota marca/fontes serve o arquivo).
 * `style`: o estilo da conversa que puxa essa letra; sem estilo, a simples.
 */
export const BRAND_FONTS = [
  {
    id: 'delicada',
    file: '@fontsource/dancing-script/files/dancing-script-latin-700-normal.woff',
    style: 'Delicado',
  },
  {
    id: 'moderna',
    file: '@fontsource/montserrat/files/montserrat-latin-700-normal.woff',
    style: 'Moderno',
  },
  {
    id: 'divertida',
    file: '@fontsource/fredoka/files/fredoka-latin-600-normal.woff',
    style: 'Divertido',
  },
  {
    id: 'elegante',
    file: '@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff',
    style: 'Elegante',
  },
  {
    id: 'simples',
    file: '@fontsource/poppins/files/poppins-latin-600-normal.woff',
    style: undefined,
  },
] as const;

type BrandFontId = (typeof BRAND_FONTS)[number]['id'];

/** Letra do estilo escolhido na conversa (sem estilo: a simples). */
export function fontForStyle(style: string | undefined): BrandFontId {
  return BRAND_FONTS.find((font) => font.style === style)?.id ?? 'simples';
}
