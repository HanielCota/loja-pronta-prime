import { beforeEach, expect, mock, spyOn, test } from 'bun:test';
import sharp from 'sharp';
import { AiUnavailableError } from '@/server/ai/errors';
import {
  GENERATION_COMING_SOON,
  MAX_GENERATIONS,
  type LogoPicks,
  type LogoStudio,
  type StudioLogo,
} from '@/features/brand/logo-studio/model';

// Run this file in its own Bun process so the module mocks stay isolated.
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
let reservations = 0;
const env: { OPENAI_API_KEY: string | undefined } = { OPENAI_API_KEY: undefined };

mock.module('@/config/env', () => ({ env }));
mock.module('@/features/support/server/impersonation', () => ({
  runAsStudent: (_actionName: string, run: () => Promise<unknown>) => run(),
}));
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
    reservations += 1;
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
const { openAiImage } = await import('@/server/ai/images');

beforeEach(() => {
  studio = { picks: {}, logos: [], generations: 0 };
  drawFailure = undefined;
  saveFailure = undefined;
  registerFailure = undefined;
  drawings = 0;
  reservations = 0;
  env.OPENAI_API_KEY = 'local-test-key';
});

test('missing OpenAI configuration keeps the quota and choices intact', async () => {
  env.OPENAI_API_KEY = undefined;
  const result = await createLogo(picks);
  expect(result.error).toBe(GENERATION_COMING_SOON);
  expect(result.studio.generationsLeft).toBe(MAX_GENERATIONS);
  expect(result.studio.picks).toEqual(picks);
  expect(reservations).toBe(0);
  expect(drawings).toBe(0);

  await expect(openAiImage('Draw a logo')).rejects.toMatchObject({
    name: 'AiUnavailableError',
    mayHaveBilled: false,
  });
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

test('tempo esgotado na IA conta a criação, porque a imagem pode ter sido cobrada', async () => {
  drawFailure = new AiUnavailableError('Request timed out', { mayHaveBilled: true });
  const log = spyOn(console, 'error').mockImplementation(() => {});
  try {
    const result = await createLogo(picks);
    expect(result.studio.generationsLeft).toBe(MAX_GENERATIONS - 1);
    expect(result.error).toContain('Esta tentativa contou como uma criação');
  } finally {
    log.mockRestore();
  }
});

test('falhas cobradas param no limite de criações', async () => {
  drawFailure = new AiUnavailableError('Request timed out', { mayHaveBilled: true });
  const log = spyOn(console, 'error').mockImplementation(() => {});
  try {
    for (let attempt = 0; attempt < MAX_GENERATIONS + 2; attempt++) await createLogo(picks);
    expect(drawings).toBe(MAX_GENERATIONS);
    expect(studio.generations).toBe(MAX_GENERATIONS);
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

test('the Images API request uses Flare and decodes the square PNG response', async () => {
  const png = await sharp({
    create: { width: 1024, height: 1024, channels: 3, background: 'white' },
  })
    .png()
    .toBuffer();
  const requests: { path: string; method: string; body: unknown }[] = [];
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      requests.push({
        path: new URL(request.url).pathname,
        method: request.method,
        body: await request.json(),
      });
      return Response.json({ data: [{ b64_json: png.toString('base64') }] });
    },
  });
  const previousBaseUrl = process.env.OPENAI_BASE_URL;
  process.env.OPENAI_BASE_URL = new URL('/v1', server.url).href;
  try {
    expect(await openAiImage('Draw a logo')).toEqual(new Uint8Array(png));
    expect(requests).toEqual([
      {
        path: '/v1/images/generations',
        method: 'POST',
        body: {
          model: 'gpt-image-2.6-flare',
          prompt: 'Draw a logo',
          size: '1024x1024',
          quality: 'medium',
          output_format: 'png',
          n: 1,
        },
      },
    ]);
  } finally {
    if (previousBaseUrl === undefined) delete process.env.OPENAI_BASE_URL;
    else process.env.OPENAI_BASE_URL = previousBaseUrl;
    await server.stop(true);
  }
});
