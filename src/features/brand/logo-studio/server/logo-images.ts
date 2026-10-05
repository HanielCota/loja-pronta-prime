import sharp from 'sharp';
import { openAiImage } from '@/server/ai/images';
import { storage } from '@/server/storage';
import { logoImagePrompt } from '../image-prompt';
import type { LogoBrief } from '../model';
import type { LogoTweak } from '../tweaks';

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
export function drawLogo(
  brief: LogoBrief,
  storeName: string,
  tweak?: LogoTweak,
): Promise<Uint8Array> {
  return openAiImage(logoImagePrompt(brief, storeName, tweak));
}

/** Lado do logo guardado: o mesmo da IA (quadrado). */
const LOGO_SIDE = 1024;

/**
 * O logo que ela mandou, pronto pra guardar: só imagem de verdade (PNG, JPEG ou WebP, conferido
 * pelo conteúdo, não pelo nome), de pé como a foto foi tirada, num quadrado de 1024 com a
 * imagem inteira no meio (o fundo transparente, se sobrar espaço) e sempre em PNG. Imagem que
 * não abre: `null`.
 */
export async function normalizeUploadedLogo(bytes: Uint8Array): Promise<Uint8Array | null> {
  try {
    const image = sharp(bytes, { limitInputPixels: 40_000_000 });
    const { format } = await image.metadata();
    if (!format || !['png', 'jpeg', 'webp'].includes(format)) return null;
    const png = await image
      .rotate()
      .resize(LOGO_SIDE, LOGO_SIDE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    return new Uint8Array(png);
  } catch {
    return null;
  }
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
