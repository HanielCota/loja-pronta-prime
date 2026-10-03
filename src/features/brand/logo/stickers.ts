import { STICKER_ART } from './sticker-art';
import { STICKER_GROUPS, STICKER_LIST } from './sticker-list';

/**
 * As figurinhas do logo (Fluent Emoji, Microsoft, licença MIT): a lista e os grupos ficam em
 * sticker-list.ts; o desenho, já conferido, em sticker-art.ts (gerado por
 * scripts/gerar-figurinhas-logo.ts).
 */
export { STICKER_GROUPS, STICKER_LIST };

export type StickerId = (typeof STICKER_LIST)[number]['id'];

export const STICKER_IDS = STICKER_LIST.map((sticker) => sticker.id) as [StickerId, ...StickerId[]];

/** Tamanho do quadrado em que as figurinhas são desenhadas. */
export const STICKER_VIEWBOX = 32;

export function stickerLabel(id: StickerId): string {
  return STICKER_LIST.find((sticker) => sticker.id === id)?.label ?? 'Figurinha';
}

/** O desenho da figurinha (só formas e cores fixas, conferidas quando foi gerado). */
export function stickerArt(id: StickerId): string {
  return STICKER_ART[id] ?? '';
}
