import { REDUCED_MOTION_ATTRIBUTE } from '@/lib/reduced-motion';

/**
 * Ajustes de leitura do perfil (Aparência), além do tema: tamanho do texto, menos animação e mais
 * contraste. Como o tema, valem só no aparelho (guardados no navegador) e viram atributos no
 * `<html>` (`data-text`, `data-motion`, `data-contrast`), que o CSS lê.
 */

/** Tamanhos do texto: a base do rem. Tudo cresce junto (texto, botões, espaços). */
export const TEXT_SIZES = {
  normal: { label: 'Normal', scale: '100%' },
  grande: { label: 'Grande', scale: '112.5%' },
  maior: { label: 'Maior', scale: '125%' },
} as const;

export type TextSize = keyof typeof TEXT_SIZES;

export type DisplaySettings = {
  text: TextSize;
  /** Ligado: menos movimento mesmo que o aparelho não peça. Desligado: segue o aparelho. */
  reduceMotion: boolean;
  /** Ligado: bordas, textos de apoio e links mais fortes. */
  moreContrast: boolean;
};

export const DEFAULT_DISPLAY: DisplaySettings = {
  text: 'normal',
  reduceMotion: false,
  moreContrast: false,
};

/** Onde cada ajuste fica guardado no navegador, e o atributo do `<html>` que ele liga. */
export const DISPLAY_KEYS = {
  text: { storage: 'display-text', attribute: 'data-text' },
  reduceMotion: { storage: 'display-motion', attribute: REDUCED_MOTION_ATTRIBUTE.name },
  moreContrast: { storage: 'display-contrast', attribute: 'data-contrast' },
} as const;

/** O valor de cada atributo quando o ajuste está ligado (sem atributo: o padrão). */
const ON = { reduceMotion: REDUCED_MOTION_ATTRIBUTE.value, moreContrast: 'more' } as const;

/** Lê o que está guardado. Sem nada (ou com lixo), o padrão. */
export function parseDisplay(read: (key: string) => string | null): DisplaySettings {
  const text = read(DISPLAY_KEYS.text.storage);
  return {
    text: text !== null && Object.hasOwn(TEXT_SIZES, text) ? (text as TextSize) : 'normal',
    reduceMotion: read(DISPLAY_KEYS.reduceMotion.storage) === ON.reduceMotion,
    moreContrast: read(DISPLAY_KEYS.moreContrast.storage) === ON.moreContrast,
  };
}

/** Os atributos do `<html>` pra estes ajustes (`null`: tirar o atributo). */
export function displayAttributes(settings: DisplaySettings): Record<string, string | null> {
  return {
    [DISPLAY_KEYS.text.attribute]: settings.text === 'normal' ? null : settings.text,
    [DISPLAY_KEYS.reduceMotion.attribute]: settings.reduceMotion ? ON.reduceMotion : null,
    [DISPLAY_KEYS.moreContrast.attribute]: settings.moreContrast ? ON.moreContrast : null,
  };
}

/** O que guardar no navegador pra cada ajuste (`null`: apagar e voltar ao padrão). */
export function displayStorage(settings: DisplaySettings): Record<string, string | null> {
  return {
    [DISPLAY_KEYS.text.storage]: settings.text === 'normal' ? null : settings.text,
    [DISPLAY_KEYS.reduceMotion.storage]: settings.reduceMotion ? ON.reduceMotion : null,
    [DISPLAY_KEYS.moreContrast.storage]: settings.moreContrast ? ON.moreContrast : null,
  };
}

/**
 * Script do `<head>`: põe os atributos antes da página aparecer, sem o texto "pular" de tamanho
 * depois. Navegador sem armazenamento (aba anônima bloqueada): fica no padrão.
 */
export const DISPLAY_SCRIPT = `(function(){try{var d=document.documentElement,k=${JSON.stringify(
  Object.values(DISPLAY_KEYS).map(({ storage, attribute }) => [storage, attribute]),
)},o={"${DISPLAY_KEYS.text.storage}":${JSON.stringify(
  Object.keys(TEXT_SIZES).filter((size) => size !== 'normal'),
)},"${DISPLAY_KEYS.reduceMotion.storage}":["${ON.reduceMotion}"],"${DISPLAY_KEYS.moreContrast.storage}":["${ON.moreContrast}"]};for(var i=0;i<k.length;i++){var v=localStorage.getItem(k[i][0]);if(v&&o[k[i][0]].indexOf(v)>=0)d.setAttribute(k[i][1],v)}}catch(e){}})()`;
