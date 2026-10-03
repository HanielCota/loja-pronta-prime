import { BRAND_PATH } from './steps';
import type { LogoConfig } from './logo/config';

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

/** O logo salvo, em PNG, pra baixar. */
export const LOGO_DOWNLOAD_PATH = `${BRAND_PATH}/logo.png`;
