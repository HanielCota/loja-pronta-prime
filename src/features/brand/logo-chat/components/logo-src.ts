import { BRAND_PATH } from '../../steps';

/** O endereço de um logo da conversa (a imagem de um id nunca muda). */
export function logoSrc(imageId: string): string {
  return `${BRAND_PATH}/imagens/${imageId}`;
}
