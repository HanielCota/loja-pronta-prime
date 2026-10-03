import { parse } from 'opentype.js';
import { LOGO_FONTS } from './fonts';
import type { LogoFonts } from './scene-render';
import { BRAND_PATH } from '../steps';

let loading: Promise<LogoFonts> | undefined;

/** As fontes do logo no navegador, baixadas uma vez (a rota de fontes da marca). */
export function loadLogoFontsInBrowser(): Promise<LogoFonts> {
  loading ??= Promise.all(
    LOGO_FONTS.map(async (font) => {
      const response = await fetch(`${BRAND_PATH}/fontes/${font.id}`);
      if (!response.ok) throw new Error(`Fonte ${font.id}: ${response.status}`);
      return [font.id, parse(await response.arrayBuffer())] as const;
    }),
  ).then((entries) => Object.fromEntries(entries) as LogoFonts);
  // Falhou (sem internet): a próxima chamada tenta de novo.
  loading.catch(() => (loading = undefined));
  return loading;
}
