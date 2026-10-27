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
import { briefFromPicks, missingStudioSteps, STUDIO_STEPS } from '../picks';
import { isLastingTweak, isLogoTweak, type LogoTweak } from '../tweaks';
import type { StudioView } from '../view';
import { refuseDuringVisit } from '@/features/support/server/impersonation';
import { drawLogo, logoImageKey, normalizeUploadedLogo, storeLogoImage } from './logo-images';
import { view } from './load';
import {
  addLogo,
  getLogoStudio,
  releaseGeneration,
  releaseUpload,
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

/** Criar ou ajustar logo gasta a criação da aluna: visitando a conta, a equipe não usa. */
const VISIT_BLOCKED = 'Visitando a conta da aluna, você não cria logo: isso gastaria uma criação dela.';

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
    // A criação só volta pra ela quando com certeza nada foi pago. Num tempo esgotado a OpenAI
    // pode ter cobrado a imagem: devolver ali deixava gerar imagens pagas sem limite.
    const billed = error instanceof AiUnavailableError && error.mayHaveBilled;
    if (!billed) await releaseGeneration(userId);
    if (!(error instanceof AiUnavailableError)) throw error;
    console.error('[logo]', error.message);
    return {
      studio: view(await getLogoStudio(userId)),
      error: billed
        ? 'Não consegui criar o logo agora. Esta tentativa contou como uma criação. Tente de novo daqui a pouco.'
        : 'Não consegui criar o logo agora. Tente de novo daqui a pouco.',
    };
  }
  // Daqui pra frente a imagem já foi paga: uma falha ao guardar não devolve a criação.
  // Devolve o saldo real e explica a falha do serviço, sem culpar a internet da aluna.
  try {
    const key = await storeLogoImage(userId, png);
    return { studio: view(await addLogo(userId, { key, brief })) };
  } catch (error) {
    console.error('[logo-save] falha ao guardar o logo criado', uploadErrorDetails(error));
    return {
      studio: view(await getLogoStudio(userId)),
      error:
        'O logo foi desenhado, mas não consegui salvar agora. Esta tentativa contou como uma criação. Suas escolhas estão guardadas. Tente de novo daqui a pouco.',
    };
  }
}

/** "Criar meu logo": guarda as escolhas e desenha o logo com elas. */
export async function createLogo(picks: unknown): Promise<StudioResult> {
  const { userId, storeName, answers } = await studioContext();
  if (await refuseDuringVisit('criar ou ajustar logo', '/loja-pronta/marca')) return { studio: view(await getLogoStudio(userId)), error: VISIT_BLOCKED };
  const parsed = logoPicksSchema.safeParse(picks);
  const brief = parsed.success ? briefFromPicks(parsed.data, answers) : null;
  if (!parsed.success || !brief) {
    const missing = parsed.success ? missingStudioSteps(parsed.data) : [];
    const error = missing.length
      ? `Falta escolher: ${missing.map((step) => STUDIO_STEPS[step].label).join(', ')}. Complete essas etapas antes de criar o logo.`
      : 'Falta escolher alguma coisa. Confira as escolhas e tente de novo.';
    return {
      studio: view(await getLogoStudio(userId)),
      error,
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
  if (await refuseDuringVisit('criar ou ajustar logo', '/loja-pronta/marca')) return { studio: view(await getLogoStudio(userId)), error: VISIT_BLOCKED };
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
  // A vaga vem antes de abrir a imagem: abrir até 40 megapixels custa CPU, e quem já usou todas
  // as vagas podia mandar imagens sem parar só pra serem abertas e recusadas.
  if (!(await reserveUpload(userId, MAX_UPLOADS))) {
    return {
      studio: view(studio),
      error: 'Você já mandou muitas imagens. Escolha uma das que estão aqui.',
    };
  }
  const png = await normalizeUploadedLogo(new Uint8Array(await file.arrayBuffer()));
  if (!png) {
    await releaseUpload(userId);
    return {
      studio: view(studio),
      error: 'Não consegui abrir essa imagem. Mande uma foto ou imagem (PNG ou JPG).',
    };
  }
  let key: string;
  try {
    key = await storeLogoImage(userId, png);
  } catch (error) {
    // A vaga só é consumida quando a imagem chega ao bucket. Registra apenas metadados seguros.
    try {
      await releaseUpload(userId);
    } catch (releaseError) {
      console.error(
        '[logo-upload] não consegui devolver a vaga reservada',
        uploadErrorDetails(releaseError),
      );
    }
    console.error('[logo-upload] falha ao guardar a imagem', uploadErrorDetails(error));
    return {
      studio: view(await getLogoStudio(userId)),
      error: 'Não consegui salvar essa imagem agora. Tente de novo daqui a pouco.',
    };
  }
  return { studio: view(await addLogo(userId, { key, uploaded: true })) };
}

/** Código e status bastam pra investigar sem registrar chaves, caminhos ou dados do logo. */
function uploadErrorDetails(error: unknown) {
  if (!error || typeof error !== 'object') return { name: 'UnknownError' };
  const details = error as {
    name?: unknown;
    Code?: unknown;
    code?: unknown;
    $metadata?: { httpStatusCode?: unknown };
  };
  return {
    name: typeof details.name === 'string' ? details.name : 'UnknownError',
    code:
      typeof details.Code === 'string'
        ? details.Code
        : typeof details.code === 'string'
          ? details.code
          : undefined,
    status:
      typeof details.$metadata?.httpStatusCode === 'number'
        ? details.$metadata.httpStatusCode
        : undefined,
  };
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
