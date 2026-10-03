import { BRAND_PATH } from './steps';
import type { LogoConfig } from './logo/config';
import type { LogoScene } from './logo/scene';

/** Endereço da prévia do logo (desenhada no servidor, com o nome dela). */
export function logoPreviewSrc(config: LogoConfig): string {
  const params = new URLSearchParams({
    t: String(config.template),
    l: config.layout,
    f: config.font,
    c: config.color,
    i: config.icon ?? 'nenhum',
    b: config.background,
  });
  return `${BRAND_PATH}/logo.svg?${params}`;
}

/**
 * O logo salvo, como ele está: a cena do editor livre (desenhada no servidor; `v` muda a cada
 * mudança salva, pro cache não mostrar a de antes) ou, antes de ela passar pelo editor, o modelo.
 */
export function savedLogoSrc(brand: {
  logo: LogoConfig;
  logoScene: LogoScene | null;
  updatedAt: Date | null;
}): string {
  if (!brand.logoScene) return logoPreviewSrc(brand.logo);
  return `${BRAND_PATH}/logo.svg?v=${brand.updatedAt?.getTime() ?? 0}`;
}

/** O logo salvo, em PNG, pra baixar. */
export const LOGO_DOWNLOAD_PATH = `${BRAND_PATH}/logo.png`;
