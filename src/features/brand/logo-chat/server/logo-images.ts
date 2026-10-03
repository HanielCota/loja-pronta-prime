import { env } from '@/config/env';
import { openAiImage, type ImageGenerator } from '@/server/ai/images';
import { storage } from '@/server/storage';
import { logoImagePrompt } from '../image-prompt';
import type { LogoBrief } from '../model';
import { fakeImage } from './fake-ai';

/**
 * As imagens do logo: gerar (pela IA) e guardar, e ler de volta. Cada aluna só alcança as dela:
 * a chave é montada com o id dela, e o id da imagem é conferido.
 */

/** Id de uma imagem (sem barra, sem ponto): o que aparece na URL. */
const IMAGE_ID = /^[a-z0-9-]{8,40}$/;

export function isLogoImageId(value: string): boolean {
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

function imageModel(): ImageGenerator {
  return env.AI_FAKE === '1' ? fakeImage : openAiImage;
}

/** Gera o logo com o resumo da conversa e guarda. Devolve a chave. */
export async function generateLogoImage(
  userId: string,
  brief: LogoBrief,
  storeName: string,
): Promise<string> {
  const png = await imageModel()(logoImagePrompt(brief, storeName));
  const key = logoImageKey(userId, crypto.randomUUID());
  await storage().put(key, png, 'image/png');
  return key;
}

/** Uma imagem dela, ou `null` (id inválido, não existe ou de outra aluna). */
export async function readLogoImage(userId: string, imageId: string): Promise<Uint8Array | null> {
  if (!isLogoImageId(imageId)) return null;
  return storage().get(logoImageKey(userId, imageId));
}
