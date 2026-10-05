/**
 * Letras da marca: fontes livres (licença OFL), do pacote @fontsource. A tela do nome mostra o
 * nome na letra do estilo que ela escolheu na conversa (a rota marca/fontes serve o arquivo).
 */
export const BRAND_FONTS = [
  {
    id: 'delicada',
    file: '@fontsource/dancing-script/files/dancing-script-latin-700-normal.woff',
  },
  {
    id: 'moderna',
    file: '@fontsource/montserrat/files/montserrat-latin-700-normal.woff',
  },
  {
    id: 'divertida',
    file: '@fontsource/fredoka/files/fredoka-latin-600-normal.woff',
  },
  {
    id: 'elegante',
    file: '@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff',
  },
  {
    id: 'simples',
    file: '@fontsource/poppins/files/poppins-latin-600-normal.woff',
  },
  {
    id: 'marcante',
    file: '@fontsource/poppins/files/poppins-latin-800-normal.woff',
  },
] as const;

export type BrandFontId = (typeof BRAND_FONTS)[number]['id'];

/** A letra que cada estilo da conversa puxa. */
const STYLE_FONTS: Record<string, BrandFontId> = {
  Delicado: 'delicada',
  Elegante: 'elegante',
  Moderno: 'moderna',
  Natural: 'delicada',
  Divertido: 'divertida',
  Profissional: 'simples',
  Artesanal: 'delicada',
};

/** Letra do estilo escolhido na conversa (sem estilo: a simples). */
export function fontForStyle(style: string | undefined): BrandFontId {
  return (style && STYLE_FONTS[style]) || 'simples';
}
