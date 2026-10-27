import { afterAll, expect, mock, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import sharp from 'sharp';
import { db } from '@/server/db';
import {
  learningTracks,
  learningStages,
  learningModules,
  learningLessons,
  learningContentBlocks,
  learningBanners,
  learningNodeDrafts,
} from '@/server/db/schema';

mock.module('@/features/auth/server/session', () => ({
  // Sem visita da equipe ("Entrar como aluna"): a sessão é da própria pessoa.
  getVisit: async () => null,
  getActiveSession: async () => ({ user: { role: 'admin' } }),
  getSessionState: async () => ({ status: 'active', session: { user: { role: 'admin' } } }),
  needsFirstPassword: () => false,
}));
mock.module('@/server/request/origin', () => ({ hasTrustedOrigin: () => true }));
let failInvalidation = false;
mock.module('next/cache', () => ({
  revalidatePath: () => {},
  revalidateTag: () => {
    if (failInvalidation) throw new Error('test cache failure');
  },
}));
const stored = new Set<string>();
let uploadHook: (() => Promise<void>) | undefined;
mock.module('@/server/storage', () => ({
  storage: () => ({
    put: async (key: string) => {
      stored.add(key);
      await uploadHook?.();
    },
    remove: async (key: string) => {
      stored.delete(key);
    },
  }),
}));
const { POST: uploadMaterial } = await import('@/app/api/admin/learning-content/media/route');
const { POST: uploadCover } = await import('@/app/api/sll/course-cover/[trackId]/route');
const { POST: uploadBanner } = await import('@/app/api/admin/sll-banners/[bannerId]/media/route');
const trackIds: string[] = [],
  nodeIds: string[] = [],
  bannerIds: string[] = [];
afterAll(async () => {
  if (nodeIds.length)
    await db.delete(learningNodeDrafts).where(inArray(learningNodeDrafts.nodeId, nodeIds));
  if (trackIds.length) await db.delete(learningTracks).where(inArray(learningTracks.id, trackIds));
  if (bannerIds.length)
    await db.delete(learningBanners).where(inArray(learningBanners.id, bannerIds));
  await db.$client.end();
});

function holdUpload() {
  let start!: () => void, release!: () => void;
  const started = new Promise<void>((resolve) => {
    start = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  uploadHook = async () => {
    start();
    await gate;
  };
  return { started, release };
}

async function fixture(kind: 'lesson' | 'track' | 'banner') {
  const id = randomUUID(),
    blockId = randomUUID(),
    oldKey = `test/old/${id}`;
  nodeIds.push(id);
  stored.clear();
  stored.add(oldKey);
  const form = new FormData();
  form.set('alt', 'Imagem do curso');
  if (kind === 'banner') {
    bannerIds.push(id);
    await db.insert(learningBanners).values({
      id,
      slug: id,
      title: 'Banner',
      description: 'Descrição',
      buttonLabel: 'Abrir',
      destination: '/sll',
      imageStorageKey: oldKey,
      imageAlt: 'Banner',
    });
  } else {
    const trackId = kind === 'track' ? id : randomUUID();
    trackIds.push(trackId);
    await db.insert(learningTracks).values({
      id: trackId,
      kind: 'complementary_course',
      slug: trackId,
      title: 'Curso',
      coverStorageKey: oldKey,
      coverAlt: 'Curso',
    });
    if (kind === 'lesson') {
      const stageId = randomUUID(),
        moduleId = randomUUID();
      await db
        .insert(learningStages)
        .values({ id: stageId, trackId, slug: stageId, title: 'Etapa' });
      await db
        .insert(learningModules)
        .values({ id: moduleId, stageId, slug: moduleId, title: 'Módulo' });
      await db.insert(learningLessons).values({ id, moduleId, slug: id, title: 'Aula' });
      await db.insert(learningContentBlocks).values({
        id: blockId,
        lessonId: id,
        kind: 'file',
        data: { storageKey: oldKey, contentType: 'text/plain', fileName: 'antigo.txt', size: 6 },
      });
      form.set('lessonId', id);
      form.set('kind', 'file');
      form.set('replaceBlockId', blockId);
      form.set('file', new File(['Novo material'], 'novo.txt', { type: 'text/plain' }));
    }
  }
  if (kind !== 'lesson')
    form.set(
      'file',
      new File(
        [
          new Uint8Array(
            await sharp({ create: { width: 2, height: 2, channels: 3, background: 'white' } })
              .png()
              .toBuffer(),
          ),
        ],
        'capa.png',
        { type: 'image/png' },
      ),
    );
  const table =
    kind === 'lesson' ? learningLessons : kind === 'track' ? learningTracks : learningBanners;
  return {
    id,
    oldKey,
    upload: () => {
      const request = new Request('http://localhost/upload', { method: 'POST', body: form });
      return kind === 'lesson'
        ? uploadMaterial(request)
        : kind === 'track'
          ? uploadCover(request, { params: Promise.resolve({ trackId: id }) })
          : uploadBanner(request, { params: Promise.resolve({ bannerId: id }) });
    },
    change: (values: { status?: 'published'; archivedAt?: Date }) =>
      db.update(table).set(values).where(eq(table.id, id)),
    liveKey: async () =>
      kind === 'lesson'
        ? (
            await db.query.learningContentBlocks.findFirst({
              where: eq(learningContentBlocks.id, blockId),
            })
          )?.data
        : kind === 'track'
          ? (await db.query.learningTracks.findFirst({ where: eq(learningTracks.id, id) }))
              ?.coverStorageKey
          : (await db.query.learningBanners.findFirst({ where: eq(learningBanners.id, id) }))
              ?.imageStorageKey,
  };
}

for (const kind of ['lesson', 'track', 'banner'] as const) {
  test(`${kind}: upload iniciado antes da publicação permanece no rascunho`, async () => {
    const item = await fixture(kind),
      gate = holdUpload();
    const pending = item.upload();
    try {
      await gate.started;
      await item.change({ status: 'published' });
    } finally {
      gate.release();
    }
    expect((await pending).status).toBe(200);
    expect(await item.liveKey()).toEqual(
      kind === 'lesson' ? expect.objectContaining({ storageKey: item.oldKey }) : item.oldKey,
    );
    const draft = await db.query.learningNodeDrafts.findFirst({
      where: eq(learningNodeDrafts.nodeId, item.id),
    });
    const key =
      kind === 'lesson'
        ? (draft?.data.blocks?.[0]?.data as { storageKey?: string } | undefined)?.storageKey
        : kind === 'track'
          ? draft?.data.coverStorageKey
          : draft?.data.imageStorageKey;
    expect(key).toBeString();
    expect(key).not.toBe(item.oldKey);
    expect(stored.has(key!)).toBe(true);
    expect(stored.has(item.oldKey)).toBe(true);
  });
  test(`${kind}: arquivar durante upload recusa a gravação e limpa o arquivo novo`, async () => {
    const item = await fixture(kind),
      gate = holdUpload();
    const pending = item.upload();
    try {
      await gate.started;
      await item.change({ archivedAt: new Date() });
    } finally {
      gate.release();
    }
    expect((await pending).status).toBe(409);
    expect(await item.liveKey()).toEqual(
      kind === 'lesson' ? expect.objectContaining({ storageKey: item.oldKey }) : item.oldKey,
    );
    expect(stored).toEqual(new Set([item.oldKey]));
  });
}

test('falha no cache após salvar a capa mantém o arquivo já referenciado no banco', async () => {
  const item = await fixture('track');
  uploadHook = undefined;
  failInvalidation = true;
  try {
    expect((await item.upload()).status).toBe(500);
    const key = await item.liveKey();
    expect(key).toBeString();
    expect(key).not.toBe(item.oldKey);
    expect(stored.has(key as string)).toBe(true);
  } finally {
    failInvalidation = false;
  }
});
