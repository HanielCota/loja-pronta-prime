import { loadFont as loadLocalFont } from '@remotion/fonts';
import { loadFont as loadManrope } from '@remotion/google-fonts/Manrope';
import dancing from '@fontsource/dancing-script/files/dancing-script-latin-700-normal.woff';
import fredoka from '@fontsource/fredoka/files/fredoka-latin-600-normal.woff';
import montserrat from '@fontsource/montserrat/files/montserrat-latin-700-normal.woff';
import playfair from '@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff';
import poppinsBold from '@fontsource/poppins/files/poppins-latin-800-normal.woff';
import poppins from '@fontsource/poppins/files/poppins-latin-600-normal.woff';
import type { LogoLetteringId } from '@/features/brand/logo-studio/options';

/** A letra do app (Manrope), como o next/font carrega lá. */
export const { fontFamily: manrope } = loadManrope('normal', {
  weights: ['400', '500', '600', '700', '800'],
  subsets: ['latin', 'latin-ext'],
});

/** As letras da marca (as mesmas de src/features/brand/fonts.ts), com o nome que o logo usa. */
const BRAND_FILES: Record<LogoLetteringId, { url: string; weight: string }> = {
  delicada: { url: dancing, weight: '700' },
  elegante: { url: playfair, weight: '700' },
  moderna: { url: montserrat, weight: '700' },
  divertida: { url: fredoka, weight: '600' },
  simples: { url: poppins, weight: '600' },
  marcante: { url: poppinsBold, weight: '800' },
};

export const brandFamily = (id: LogoLetteringId | null) =>
  id ? `'Logo ${id}', ${manrope}` : manrope;

for (const [id, file] of Object.entries(BRAND_FILES)) {
  void loadLocalFont({ family: `Logo ${id}`, url: file.url, weight: file.weight });
}
