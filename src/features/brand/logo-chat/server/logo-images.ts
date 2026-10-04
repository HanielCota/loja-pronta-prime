import { openAiImage } from '@/server/ai/images';
import { storage } from '@/server/storage';
import { logoImagePrompt } from '../image-prompt';
import type { LogoBrief } from '../model';

/**
 * As imagens do logo: gerar (pela IA) e guardar, e ler de volta. Cada aluna só alcança as dela:
 * a chave é montada com o id dela, e o id da imagem é conferido.
 */

/** Id de uma imagem (sem barra, sem ponto): o que aparece na URL. */
const IMAGE_ID = /^[a-z0-9-]{8,40}$/;

function isLogoImageId(value: string): boolean {
  return IMAGE_ID.test(value);
}

export function logoImageKey(userId: string, imageId: string): string {
  if (!isLogoImageId(imageId)) throw new Error('Id de imagem inválido');
  return `logos/${userId.replace(/[^\w-]/g, '')}/${imageId}.png`;
}

/** O id de volta, a partir da chave guardada (pra montar a URL). */
export function imageIdFromKey(key: string): string | null {
  const id = key
    .split('/')
    .at(-1)
    ?.replace(/\.png$/, '');
  return id && isLogoImageId(id) ? id : null;
}

/** Desenha o logo com o resumo da conversa (a parte que custa: chama a IA). */
export function drawLogo(brief: LogoBrief, storeName: string): Promise<Uint8Array> {
  return openAiImage(logoImagePrompt(brief, storeName));
}

/** Guarda um logo dela. Devolve a chave. */
export async function storeLogoImage(userId: string, png: Uint8Array): Promise<string> {
  const key = logoImageKey(userId, crypto.randomUUID());
  await storage().put(key, png, 'image/png');
  return key;
}

/** Uma imagem dela, ou `null` (id inválido, não existe ou de outra aluna). */
export async function readLogoImage(userId: string, imageId: string): Promise<Uint8Array | null> {
  if (!isLogoImageId(imageId)) return null;
  return storage().get(logoImageKey(userId, imageId));
}
