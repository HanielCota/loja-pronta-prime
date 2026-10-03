import type { LogoConfig } from './config';
import { mainColor, addElement } from './editor';
import type { LogoFontId } from './fonts';
import type { SceneIconId } from './icons';
import { inkOn, LOGO_COLORS } from './palette';
import type { LogoScene, SceneElement } from './scene';

/**
 * As escolhas rápidas do editor (a aba "Estilo"): mudam o logo inteiro de uma vez, como o estúdio
 * guiado fazia, mas em cima da cena, sem desfazer o que ela arrumou à mão. Funções puras.
 */

const WHITE = '#ffffff';

/** O estilo do logo como ele está: a cor principal, a letra, o desenho e o fundo. */
export type SceneStyle = {
  /** A tinta principal (a cor do nome; com fundo colorido, a do fundo). */
  color: string;
  font: LogoFontId;
  icon: SceneIconId | null;
  /** Fundo colorido (a cor principal) com o resto em branco. */
  colored: boolean;
};

function nameText(scene: LogoScene) {
  return (
    scene.elements.find((element) => element.type === 'text' && element.source === 'name') ??
    scene.elements.find((element) => element.type === 'text')
  );
}

export function sceneStyle(scene: LogoScene): SceneStyle {
  const colored = scene.background !== WHITE;
  const name = nameText(scene);
  const icon = scene.elements.find((element) => element.type === 'icon');
  return {
    color: colored ? scene.background : mainColor(scene),
    font: name?.type === 'text' ? name.font : 'simples',
    icon: icon?.type === 'icon' ? icon.icon : null,
    colored,
  };
}

/** A cor da paleta que dá essa tinta (a tinta é a cor escurecida pra ficar legível). */
export function paletteIdFor(ink: string) {
  return LOGO_COLORS.find((color) => color.hex === ink || inkOn(color.hex) === ink)?.id;
}

const recolor = (scene: LogoScene, map: (color: string) => string): LogoScene => ({
  ...scene,
  background: map(scene.background),
  // As figurinhas ficam com as cores delas.
  elements: scene.elements.map((element) =>
    element.type === 'sticker'
      ? element
      : ({ ...element, color: map(element.color) } as SceneElement),
  ),
});

/** Troca a cor principal (onde ela aparece, no fundo ou nas partes) pela cor da paleta escolhida. */
export function applyColor(scene: LogoScene, paletteHex: string): LogoScene {
  const old = sceneStyle(scene).color;
  const ink = inkOn(paletteHex);
  return recolor(scene, (color) => (color === old ? ink : color));
}

/** A mesma letra em todos os textos. */
export function applyFont(scene: LogoScene, font: LogoFontId): LogoScene {
  return {
    ...scene,
    elements: scene.elements.map((element) =>
      element.type === 'text' ? { ...element, font } : element,
    ),
  };
}

/**
 * Troca o desenho principal (o primeiro, e os iguais a ele). Sem nenhum desenho, põe um em cima do
 * meio, na cor principal (no fundo colorido, em branco).
 */
export function applyIcon(scene: LogoScene, icon: SceneIconId): LogoScene {
  const current = sceneStyle(scene);
  if (current.icon) {
    return {
      ...scene,
      elements: scene.elements.map((element) =>
        element.type === 'icon' && element.icon === current.icon ? { ...element, icon } : element,
      ),
    };
  }
  const color = current.colored ? WHITE : current.color;
  const added = addElement(scene, { type: 'icon', icon, color, size: 200 });
  if (!added) return scene;
  return {
    ...added.scene,
    elements: added.scene.elements.map((element) =>
      element.id === added.id ? { ...element, y: 260 } : element,
    ),
  };
}

/** Sem desenho nenhum. */
export function removeIcons(scene: LogoScene): LogoScene {
  return { ...scene, elements: scene.elements.filter((element) => element.type !== 'icon') };
}

/**
 * Fundo colorido ou branco. Colorido: o fundo ganha a cor principal e o que era dessa cor fica
 * branco (e o branco, colorido). Branco: o contrário.
 */
export function applyBackground(scene: LogoScene, colored: boolean): LogoScene {
  const style = sceneStyle(scene);
  if (style.colored === colored) return scene;
  const ink = style.color;
  const swap = (color: string) => (color === ink ? WHITE : color === WHITE ? ink : color);
  return recolor(scene, swap);
}

/** O estilo de agora como receita do estúdio, pra montar um formato (modelo) com ele. */
export function styleToConfig(style: SceneStyle, template: LogoConfig): LogoConfig {
  return {
    ...template,
    font: style.font,
    color: paletteIdFor(style.color) ?? template.color,
    icon: template.icon === null ? null : ((style.icon ?? template.icon) as LogoConfig['icon']),
    background: style.colored ? 'cor' : 'branco',
  };
}
