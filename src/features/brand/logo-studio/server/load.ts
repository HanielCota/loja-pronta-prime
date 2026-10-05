import type { LogoStudio } from '../model';
import { toStudioView, type StudioView } from '../view';
import { imageIdFromKey } from './logo-images';
import { getLogoStudio } from './studio-store';

/** O estúdio como a tela recebe (com o id das imagens, não a chave guardada). */
export function view(studio: LogoStudio): StudioView {
  return toStudioView(studio, imageIdFromKey);
}

/** O estúdio como a página abre. */
export async function loadStudioView(userId: string): Promise<StudioView> {
  return view(await getLogoStudio(userId));
}
