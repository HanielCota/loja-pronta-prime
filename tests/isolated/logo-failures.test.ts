import { beforeEach, expect, mock, spyOn, test } from 'bun:test';
import { AiUnavailableError } from '@/server/ai/errors';
import {
  MAX_GENERATIONS,
  type LogoPicks,
  type LogoStudio,
  type StudioLogo,
} from '@/features/brand/logo-studio/model';

// Execute este arquivo sozinho: os substitutos dos serviços não podem afetar outras suítes.
// A action e a conversão para a tela são reais; apenas acesso, banco, IA e bucket são controlados.
const picks: LogoPicks = {
  kind: 'nome',
  colors: { id: 'rosa' },
  lettering: { id: 'simples' },
  background: 'branco',
  look: 'ilustracao',
};
let studio: LogoStudio;
let drawFailure: Error | undefined;
let saveFailure: Error | undefined;
let registerFailure: Error | undefined;
let drawings = 0;

mock.module('@/features/brand/server/brand', () => ({
  requireBrandAction: async () => ({
    userId: 'test-student',
    brand: { name: 'Loja da Ana' },
    answers: {},
  }),
}));
mock.module('@/features/brand/server/brand-store', () => ({ saveBrand: async () => {} }));
mock.module('@/features/brand/logo-studio/server/logo-images', () => ({
  drawLogo: async () => {
    drawings += 1;
    if (drawFailure) throw drawFailure;
    return new Uint8Array([1, 2, 3]);
  },
  storeLogoImage: async () => {
    if (saveFailure) throw saveFailure;
    return 'logos/test-student/test-image-0001.png';
  },
  imageIdFromKey: (key: string) => key.split('/').at(-1)?.replace('.png', '') ?? null,
  logoImageKey: (_userId: string, id: string) => `logos/test-student/${id}.png`,
  normalizeUploadedLogo: async () => null,
}));
mock.module('@/features/brand/logo-studio/server/studio-store', () => ({
  getLogoStudio: async () => studio,
  saveLogoPicks: async (_userId: string, value: LogoPicks) => {
    studio.picks = value;
    return studio;
  },
  reserveGeneration: async () => {
    if (studio.generations >= MAX_GENERATIONS) return false;
    studio.generations += 1;
    return true;
  },
  releaseGeneration: async () => {
    studio.generations -= 1;
  },
  addLogo: async (_userId: string, logo: StudioLogo) => {
    if (registerFailure) throw registerFailure;
    studio.logos.push(logo);
    return studio;
  },
  reserveUpload: async () => true,
  releaseUpload: async () => {},
}));
const { createLogo, tweakLogo } = await import('@/features/brand/logo-studio/server/actions');

beforeEach(() => {
  studio = { picks: {}, logos: [], generations: 0 };
  drawFailure = undefined;
  saveFailure = undefined;
  registerFailure = undefined;
  drawings = 0;
});

test('falha da IA devolve a criação e mantém as escolhas', async () => {
  drawFailure = new AiUnavailableError('Service unavailable');
  const log = spyOn(console, 'error').mockImplementation(() => {});
  try {
    const result = await createLogo(picks);
    expect(result.studio.generationsLeft).toBe(MAX_GENERATIONS);
    expect(result.studio.picks).toEqual(picks);
    expect(result.error).toContain('Não consegui criar o logo');
  } finally {
    log.mockRestore();
  }
});

test.each(['bucket', 'registro'])(
  'falha no %s mostra o saldo pago e não expõe detalhes do serviço',
  async (stage) => {
    const failure = Object.assign(new Error('private-bucket-and-key'), {
      name: 'StorageError',
      code: 'AccessDenied',
    });
    if (stage === 'bucket') saveFailure = failure;
    else registerFailure = failure;
    const log = spyOn(console, 'error').mockImplementation(() => {});
    try {
      const result = await createLogo(picks);
      expect(result.studio.generationsLeft).toBe(MAX_GENERATIONS - 1);
      expect(result.studio.logos).toHaveLength(0);
      expect(result.studio.picks).toEqual(picks);
      expect(result.error).toContain('Esta tentativa contou como uma criação');
      expect(result.error).not.toContain('private-bucket-and-key');
      expect(JSON.stringify(log.mock.calls)).not.toContain('private-bucket-and-key');
      expect(drawings).toBe(1);
    } finally {
      log.mockRestore();
    }
  },
);

test('falha ao salvar um ajuste conserva o logo anterior e atualiza o saldo', async () => {
  const original = await createLogo(picks);
  const imageId = original.studio.logos[0]!.imageId;
  saveFailure = new Error('Bucket unavailable');
  const log = spyOn(console, 'error').mockImplementation(() => {});
  try {
    const result = await tweakLogo(imageId, 'mais-colorido');
    expect(result.studio.logos).toEqual(original.studio.logos);
    expect(result.studio.generationsLeft).toBe(MAX_GENERATIONS - 2);
    expect(result.error).toContain('não consegui salvar');
  } finally {
    log.mockRestore();
  }
});

test('o limite impede nova geração mesmo depois de falhas de armazenamento', async () => {
  studio.generations = MAX_GENERATIONS;
  const result = await createLogo(picks);
  expect(drawings).toBe(0);
  expect(result.studio.generationsLeft).toBe(0);
  expect(result.error).toContain('Você já criou');
});
