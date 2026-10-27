import { afterAll, expect, mock, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as schema from '@/server/db/schema';

const applicationName = `copy-test-${randomUUID()}`;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  application_name: applicationName,
});
const database = drizzle(pool, { schema });
const userId = randomUUID();
const trackId = randomUUID();
const key = `test.${randomUUID()}`;
mock.module('@/server/db', () => ({ db: database }));
mock.module('@/features/admin/server/access', () => ({ requireAdmin: async () => ({}) }));
mock.module('next/cache', () => ({
  refresh: () => {},
  revalidatePath: () => {},
  revalidateTag: () => {},
  unstable_cache: (read: (...args: unknown[]) => unknown) => read,
}));
mock.module('next/navigation', () => ({
  unstable_rethrow: () => {},
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
mock.module('@/features/products/server/access', () => ({
  requireProduct: async () => ({ session: { user: { id: userId } }, products: ['sll'] }),
  requireProductAction: async () => ({ userId }),
  getStudentProducts: async () => ({ products: ['sll'] }),
}));
mock.module('@/features/auth/server/session', () => ({
  // Sem visita da equipe ("Entrar como aluna"): a sessão é da própria pessoa.
  getVisit: async () => null,
  getSessionState: async () => ({
    status: 'active',
    session: { user: { id: userId, role: 'user' } },
  }),
  needsFirstPassword: () => false,
}));
mock.module('@/server/storage', () => ({
  storage: () => ({ stream: async () => ({ body: 'Material de teste', length: 17 }) }),
}));
mock.module('@/features/sll/copy', () => ({
  SLL_COPY: { [key]: 'Padrão' },
  SLL_COPY_GROUPS: [{ fields: [{ key }] }],
}));
const { publishSllCopy, saveSllCopy } = await import('@/features/admin/server/copy-actions');

afterAll(async () => {
  await database.delete(schema.learningTracks).where(eq(schema.learningTracks.id, trackId));
  await database.delete(schema.user).where(eq(schema.user.id, userId));
  for (const table of ['learning_text_drafts', 'learning_text_history', 'learning_texts'])
    await pool.query(`delete from ${table} where key = $1`, [key]);
  await pool.end();
});

async function waitForLock(event: string) {
  const deadline = Date.now() + 5_000;
  do {
    const { rows } = await pool.query(
      'select 1 from pg_stat_activity where application_name = $1 and wait_event = $2',
      [applicationName, event],
    );
    if (rows.length) return;
    await Bun.sleep(20);
  } while (Date.now() < deadline);
  throw new Error(`A transação não aguardou o bloqueio ${event}.`);
}

test('publicar e salvar ao mesmo tempo preserva o novo rascunho', async () => {
  await pool.query('insert into learning_text_history (key, value) values ($1, $2)', [
    key,
    'Anterior',
  ]);
  await pool.query('insert into learning_text_drafts (key, value) values ($1, $2)', [
    key,
    'Rascunho A',
  ]);
  const blocker = await pool.connect();
  let publication: ReturnType<typeof publishSllCopy> | undefined;
  let saving: ReturnType<typeof saveSllCopy> | undefined;
  try {
    await blocker.query('begin');
    // Segura a publicação depois da leitura do rascunho, no ponto em que a perda acontecia.
    await blocker.query('select key from learning_text_history where key = $1 for update', [key]);
    const form = new FormData();
    form.set('groupIndex', '0');
    publication = publishSllCopy(form);
    await waitForLock('transactionid');
    form.set(key, 'Rascunho B');
    saving = saveSllCopy({ saved: false, message: '' }, form);
    await waitForLock('advisory');
    await blocker.query('commit');
    expect((await publication).saved).toBe(true);
    expect((await saving).saved).toBe(true);
    const live = await pool.query('select value from learning_texts where key = $1', [key]);
    const draft = await pool.query('select value from learning_text_drafts where key = $1', [key]);
    expect(live.rows[0]?.value).toBe('Rascunho A');
    expect(draft.rows[0]?.value).toBe('Rascunho B');
  } finally {
    await blocker.query('rollback');
    blocker.release();
    await Promise.allSettled([publication, saving].filter(Boolean));
  }
}, 15_000);

test('a aula de apoio abre com seus materiais e progresso sem liberar as outras aulas da Biblioteca', async () => {
  const stages = [randomUUID(), randomUUID(), randomUUID()];
  const modules = [randomUUID(), randomUUID(), randomUUID()];
  const lessons = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const blocks = [randomUUID(), randomUUID()];
  await database
    .insert(schema.user)
    .values({ id: userId, name: 'Ana Teste', email: `${userId}@teste.com` });
  await database.insert(schema.learningTracks).values({
    id: trackId,
    kind: 'method',
    slug: `test-${trackId}`,
    title: 'Método',
    status: 'published',
  });
  await database.insert(schema.learningStages).values(
    stages.map((id, position) => ({
      id,
      trackId,
      slug: `etapa-${position + 1}`,
      title: `Etapa ${position + 1}`,
      position,
      status: 'published' as const,
    })),
  );
  await database.insert(schema.learningModules).values(
    modules.map((id, position) => ({
      id,
      stageId: stages[position]!,
      slug: 'modulo',
      title: 'Módulo',
      status: 'published' as const,
    })),
  );
  await database.insert(schema.learningLessons).values([
    { id: lessons[0], moduleId: modules[0]!, slug: 'base', title: 'Base', status: 'published' },
    {
      id: lessons[2],
      moduleId: modules[2]!,
      slug: 'apoio',
      title: 'Aula de apoio',
      status: 'published',
    },
    {
      id: lessons[3],
      moduleId: modules[2]!,
      slug: 'fechada',
      title: 'Outra aula',
      position: 1,
      status: 'published',
    },
    {
      id: lessons[4],
      moduleId: modules[1]!,
      slug: 'outra-acao',
      title: 'Outra ação do plano',
      position: 1,
      status: 'published',
    },
  ]);
  await database.insert(schema.learningLessons).values({
    id: lessons[1],
    moduleId: modules[1]!,
    slug: 'acao',
    title: 'Ação do plano',
    relatedLessonId: lessons[2],
    status: 'published',
  });
  await database.insert(schema.learningContentBlocks).values(
    blocks.map((id, index) => ({
      id,
      lessonId: lessons[index + 2]!,
      kind: 'file' as const,
      data: {
        storageKey: 'test/material.pdf',
        fileName: 'material.pdf',
        contentType: 'application/pdf',
        size: 17,
      },
    })),
  );
  await database
    .insert(schema.learningLessonProgress)
    .values({ userId, lessonId: lessons[0]!, completedAt: new Date() });

  const { getSllLessonViewer } = await import('@/features/sll/server/lesson-viewer');
  const { getLessonMaterials } = await import('@/features/sll/tools/server/materials');
  const { getTrackStageAccess } = await import('@/features/sll/server/stage-lock');
  const { recordSllLessonView, saveSllLessonPosition, setSllLessonCompletion } =
    await import('@/features/sll/server/progress-actions');
  const { GET } = await import('@/app/api/sll/material/[blockId]/route');
  const material = (id: string) =>
    GET(new Request('http://localhost/material'), { params: Promise.resolve({ blockId: id }) });
  expect((await getTrackStageAccess(userId, trackId))?.stages[2]?.isUnlocked).toBe(false);
  expect((await getSllLessonViewer(lessons[2]!))?.blocks).toHaveLength(1);
  expect((await getSllLessonViewer(lessons[2]!))?.lessons.map((item) => item.id)).toEqual([
    lessons[2]!,
  ]);
  expect((await getSllLessonViewer(lessons[2]!))?.lesson.nextId).toBeNull();
  expect((await getSllLessonViewer(lessons[3]!))?.blocks).toHaveLength(0);
  expect((await recordSllLessonView(trackId, lessons[2]!)).saved).toBe(true);
  expect((await recordSllLessonView(trackId, lessons[3]!)).saved).toBe(false);
  expect((await saveSllLessonPosition(trackId, lessons[2]!, 30)).saved).toBe(true);
  expect((await saveSllLessonPosition(trackId, lessons[3]!, 30)).saved).toBe(false);
  expect((await setSllLessonCompletion(trackId, lessons[2]!, true)).saved).toBe(true);
  expect((await setSllLessonCompletion(trackId, lessons[3]!, true)).saved).toBe(false);
  expect((await material(blocks[0]!)).status).toBe(200);
  expect((await material(blocks[1]!)).status).toBe(404);
  const listed = await getLessonMaterials();
  expect(listed.find((item) => item.lessonId === lessons[2])?.destination).toBe(
    `/api/sll/material/${blocks[0]}`,
  );
  expect(listed.find((item) => item.lessonId === lessons[3])?.destination).toBeNull();

  // Retirar a ação de publicação também retira a exceção, mesmo com progresso já salvo.
  await database
    .update(schema.learningLessons)
    .set({ status: 'draft' })
    .where(eq(schema.learningLessons.id, lessons[1]!));
  expect((await getSllLessonViewer(lessons[2]!))?.blocks).toHaveLength(0);
  expect(
    (await getLessonMaterials()).find((item) => item.lessonId === lessons[2])?.destination,
  ).toBeNull();
  expect((await material(blocks[0]!)).status).toBe(404);
  expect((await recordSllLessonView(trackId, lessons[2]!)).saved).toBe(false);
  await database
    .update(schema.learningLessons)
    .set({ status: 'published' })
    .where(eq(schema.learningLessons.id, lessons[1]!));
  await database
    .update(schema.learningLessonProgress)
    .set({ completedAt: null })
    .where(eq(schema.learningLessonProgress.lessonId, lessons[0]!));
  expect((await getSllLessonViewer(lessons[2]!))?.blocks).toHaveLength(0);
  expect((await material(blocks[0]!)).status).toBe(404);
}, 15_000);
