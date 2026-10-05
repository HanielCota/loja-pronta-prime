import { MAX_GENERATIONS, type LogoPicks, type LogoStudio } from './model';
import { NAME_ONLY_SYMBOL } from './picks';

/**
 * O que a tela do estúdio recebe: as escolhas, os logos (com o id da imagem, não a chave
 * guardada) e quantas criações ainda restam. Função pura.
 */

export type StudioViewLogo = {
  /** O id do logo (a imagem vem de marca/imagens/<id>). */
  imageId: string;
  /** "Logo 1", "Logo 2"...: pra comparar e pro leitor de tela. */
  number: number;
  /**
   * Dá pra ajustar com um toque (a IA criou e o resumo dele está guardado; o logo que ela mandou,
   * não: os ajustes redesenham pela IA).
   */
  tweakable: boolean;
  /** Foi ela que mandou (não a IA que criou). */
  uploaded: boolean;
  /** Só o nome, sem desenho ("Outro desenho" não vale). */
  nameOnly: boolean;
};

export type StudioView = {
  picks: LogoPicks;
  logos: StudioViewLogo[];
  generationsLeft: number;
};

export function toStudioView(
  studio: LogoStudio,
  imageIdFromKey: (key: string) => string | null,
): StudioView {
  const logos: StudioViewLogo[] = [];
  for (const logo of studio.logos) {
    const imageId = imageIdFromKey(logo.key);
    if (!imageId) continue;
    logos.push({
      imageId,
      number: logos.length + 1,
      uploaded: Boolean(logo.uploaded),
      tweakable: Boolean(logo.brief) && !logo.uploaded,
      nameOnly: logo.brief?.symbol === NAME_ONLY_SYMBOL,
    });
  }
  return {
    picks: studio.picks,
    logos,
    generationsLeft: Math.max(0, MAX_GENERATIONS - studio.generations),
  };
}
