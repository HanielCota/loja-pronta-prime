import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'opentype.js';
import { LOGO_FONTS } from './fonts';
import type { LogoFonts } from './render';

let loading: Promise<LogoFonts> | undefined;

/**
 * As fontes do logo, lidas do node_modules uma vez por processo (o desenho de cada logo usa as
 * fontes já carregadas). Só no servidor.
 */
export function loadLogoFonts(): Promise<LogoFonts> {
  loading ??= Promise.all(
    LOGO_FONTS.map(async (font) => {
      const file = await readFile(path.join(process.cwd(), 'node_modules', font.file));
      const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
      return [font.id, parse(buffer as ArrayBuffer)] as const;
    }),
  ).then((entries) => Object.fromEntries(entries) as LogoFonts);
  // Falhou (arquivo faltando): a próxima chamada tenta de novo.
  loading.catch(() => (loading = undefined));
  return loading;
}
