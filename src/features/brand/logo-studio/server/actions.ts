'use server';

import { redirect } from 'next/navigation';
import { AiUnavailableError } from '@/server/ai/errors';
import { requireBrandAction } from '../../server/brand';
import { saveBrand } from '../../server/brand-store';
import { brandStepPath } from '../../steps';
import {
  MAX_GENERATIONS,
  MAX_UPLOAD_BYTES,
  MAX_UPLOADS,
  logoPicksSchema,
  type LogoBrief,
  type LogoStudio,
} from '../model';
import { briefFromPicks } from '../picks';
import { isLastingTweak, isLogoTweak, type LogoTweak } from '../tweaks';
import type { StudioView } from '../view';
import { drawLogo, logoImageKey, normalizeUploadedLogo, storeLogoImage } from './logo-images';
import { view } from './load';
import {
  addLogo,
  getLogoStudio,
  releaseGeneration,
  reserveGeneration,
  reserveUpload,
  saveLogoPicks,
} from './studio-store';

/**
 * O estúdio do logo: guardar as escolhas, criar o logo (ou um ajuste dele), mandar o próprio
 * logo e escolher um. Cada action confere o acesso, reserva o que custa, chama quem desenha,
 * guarda (os logos sempre acrescentando, nunca regravando) e devolve a tela pronta.
 */

export type StudioResult = {
  studio: StudioView;
  error?: string;
  /** Escolheu o logo: a tela vai pra cá (sem redirect na action, que a tela leria como erro). */
  next?: string;
};

async function studioContext() {
  const access = await requireBrandAction({ logo: true });
  // O logo vem depois do nome (a página já leva pra lá; aqui, por quem chama a action direto).
  if (!access.brand.name) redirect(brandStepPath('nome'));
  return { ...access, storeName: access.brand.name };
}

/** Guarda as escolhas (a cada "Continuar"): ela sai e volta de onde parou. */
export async function saveStudioPicks(picks: unknown): Promise<void> {
  const { userId } = await studioContext();
  const parsed = logoPicksSchema.safeParse(picks);
  if (parsed.success) await saveLogoPicks(userId, parsed.data);
}

/**
 * Desenha um logo com `brief` (dentro do limite de criações) e guarda no fim da lista. `tweak`:
 * o ajuste de um toque desta vez ("Outro desenho" vale só pra ela).
 */
async function draw(
  userId: string,
  storeName: string,
  studio: LogoStudio,
  brief: LogoBrief,
  tweak?: LogoTweak,
): Promise<StudioResult> {
  if (!(await reserveGeneration(userId, MAX_GENERATIONS))) {
    return {
      studio: view(studio),
      error: `Você já criou ${MAX_GENERATIONS} logos. Escolha um deles pra seguir.`,
    };
  }
  let png: Uint8Array;
  try {
    png = await drawLogo(brief, storeName, tweak);
  } catch (error) {
    // A imagem não saiu: a criação volta pra ela (nada foi pago).
    await releaseGeneration(userId);
    if (!(error instanceof AiUnavailableError)) throw error;
    console.error('[logo]', error.message);
    return {
      studio: view(await getLogoStudio(userId)),
      error: 'Não consegui criar o logo agora. Tente de novo daqui a pouco.',
    };
  }
  // Daqui pra frente a imagem já foi paga: uma falha ao guardar não devolve a criação.
  const key = await storeLogoImage(userId, png);
  return { studio: view(await addLogo(userId, { key, brief })) };
}

/** "Criar meu logo": guarda as escolhas e desenha o logo com elas. */
export async function createLogo(picks: unknown): Promise<StudioResult> {
  const { userId, storeName, answers } = await studioContext();
  const parsed = logoPicksSchema.safeParse(picks);
  const brief = parsed.success ? briefFromPicks(parsed.data, answers) : null;
  if (!parsed.success || !brief) {
    return {
      studio: view(await getLogoStudio(userId)),
      error: 'Falta escolher alguma coisa. Confira as escolhas e tente de novo.',
    };
  }
  const studio = await saveLogoPicks(userId, parsed.data);
  return draw(userId, storeName, studio, brief);
}

/**
 * Um ajuste de um toque ("Mais colorido"...) num logo que a IA criou: a versão nova parte do
 * resumo daquele logo, e o ajuste continua valendo nos próximos (menos "Outro desenho").
 */
export async function tweakLogo(imageId: string, tweak: string): Promise<StudioResult> {
  const { userId, storeName } = await studioContext();
  const studio = await getLogoStudio(userId);
  const key = keyOf(userId, imageId);
  const brief = studio.logos.find((logo) => logo.key === key)?.brief;
  if (!isLogoTweak(tweak) || !brief) {
    return { studio: view(studio), error: 'Esse logo não dá pra ajustar. Crie outro.' };
  }
  const tweaks = [...new Set([...(brief.tweaks ?? []), ...(isLastingTweak(tweak) ? [tweak] : [])])];
  return draw(userId, storeName, studio, { ...brief, tweaks }, tweak);
}

/**
 * "Já tenho um logo": ela manda a imagem dela, que entra na lista pra ela escolher, como um logo
 * criado (sem gastar criação).
 */
export async function uploadLogo(form: FormData): Promise<StudioResult> {
  const { userId } = await studioContext();
  const studio = await getLogoStudio(userId);
  const file = form.get('logo');
  if (!(file instanceof File) || file.size === 0) {
    return { studio: view(studio), error: 'Escolha a imagem do seu logo.' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { studio: view(studio), error: 'Essa imagem é grande demais. Tente outra.' };
  }
  const png = await normalizeUploadedLogo(new Uint8Array(await file.arrayBuffer()));
  if (!png) {
    return {
      studio: view(studio),
      error: 'Não consegui abrir essa imagem. Mande uma foto ou imagem (PNG ou JPG).',
    };
  }
  if (!(await reserveUpload(userId, MAX_UPLOADS))) {
    return {
      studio: view(studio),
      error: 'Você já mandou muitas imagens. Escolha uma das que estão aqui.',
    };
  }
  const key = await storeLogoImage(userId, png);
  return { studio: view(await addLogo(userId, { key, uploaded: true })) };
}

/** A chave de um logo dela pelo id (id inválido: `null`). */
function keyOf(userId: string, imageId: string): string | null {
  try {
    return logoImageKey(userId, imageId);
  } catch {
    return null;
  }
}

/** Escolhe um logo do estúdio: vira o logo da loja e ela segue (ou volta pra revisão). */
export async function chooseLogo(imageId: string, editing: boolean): Promise<StudioResult> {
  const { userId, revising, logoOnly } = await studioContext();
  const studio = await getLogoStudio(userId);
  const key = keyOf(userId, imageId);
  // Só um logo que está no estúdio dela (nada de chave inventada).
  if (!key || !studio.logos.some((logo) => logo.key === key)) {
    return { studio: view(studio), error: 'Esse logo não está mais aqui. Escolha outro.' };
  }
  await saveBrand(userId, { logoImage: key });
  const next = logoOnly
    ? '/loja-pronta'
    : brandStepPath(editing || revising ? 'revisao' : 'descricao');
  return { studio: view(studio), next };
}
