/**
 * Letras da marca: fontes livres (licença OFL), do pacote @fontsource. A tela do nome mostra o
 * nome na letra do estilo que ela escolheu na conversa (a rota marca/fontes serve o arquivo).
 * `style`: o estilo da conversa que puxa essa letra.
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
