import type { LogoConfig } from './config';
import { configToScene } from './from-config';
import { renderSceneSvg, type LogoFonts } from './scene-render';

export type { LogoFonts } from './scene-render';

/**
 * Um modelo de logo (versão 1) em SVG: vira cena (cada coisa no lugar que o formato põe) e
 * sai pelo mesmo desenho do editor livre. Função pura; o nome vira contorno com a fonte.
 */
export function renderLogoSvg(config: LogoConfig, name: string, fonts: LogoFonts): string {
  return renderSceneSvg(configToScene(config, name, fonts), name, fonts);
}
