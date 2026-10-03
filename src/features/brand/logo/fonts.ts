/**
 * Letras do logo: fontes livres (licença OFL), do pacote @fontsource. O desenho transforma o nome
 * em contorno com essas fontes, então o logo sai igual na tela e no arquivo, sem depender de
 * fonte instalada. `style`: o estilo da conversa que puxa essa letra no primeiro modelo.
 */
export const LOGO_FONTS = [
  {
    id: 'delicada',
    label: 'Delicada',
    file: '@fontsource/dancing-script/files/dancing-script-latin-700-normal.woff',
    style: 'Delicado',
  },
  {
    id: 'moderna',
    label: 'Moderna',
    file: '@fontsource/montserrat/files/montserrat-latin-700-normal.woff',
    style: 'Moderno',
  },
  {
    id: 'divertida',
    label: 'Divertida',
    file: '@fontsource/fredoka/files/fredoka-latin-600-normal.woff',
    style: 'Divertido',
  },
  {
    id: 'elegante',
    label: 'Elegante',
    file: '@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff',
    style: 'Elegante',
  },
  {
    id: 'simples',
    label: 'Simples',
    file: '@fontsource/poppins/files/poppins-latin-600-normal.woff',
    style: undefined,
  },
  {
    id: 'charmosa',
    label: 'Charmosa',
    file: '@fontsource/pacifico/files/pacifico-latin-400-normal.woff',
    style: undefined,
  },
] as const;

export type LogoFontId = (typeof LOGO_FONTS)[number]['id'];

export const LOGO_FONT_IDS = LOGO_FONTS.map((font) => font.id) as [LogoFontId, ...LogoFontId[]];

/** Letra do estilo escolhido na conversa (sem estilo: a simples). */
export function fontForStyle(style: string | undefined): LogoFontId {
  return LOGO_FONTS.find((font) => font.style === style)?.id ?? 'simples';
}
