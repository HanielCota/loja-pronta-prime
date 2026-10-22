import { afterAll, expect, mock, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/server/db/schema';

const applicationName = `editor-race-${randomUUID()}`;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  application_name: applicationName,
});
const database = drizzle(pool, { schema });
mock.module('@/server/db', () => ({ db: database }));
mock.module('@/features/admin/server/access', () => ({
  requireAdmin: async () => ({ user: { id: randomUUID() } }),
  requireStaff: async () => ({
    user: { id: randomUUID(), role: 'admin' },
    staff: 'admin' as const,
  }),
}));
mock.module('next/cache', () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  unstable_cache: (read: (...args: unknown[]) => unknown) => read,
}));
const { saveLearningNode, saveLearningLesson } = await import('@/features/admin/server/actions');
const { saveSllBanner } = await import('@/features/admin/server/banner-actions');
const { saveSllResource } = await import('@/features/admin/server/resource-actions');
const tracks: string[] = [],
  nodes: string[] = [],
  banners: string[] = [],
  resources: string[] = [];
afterAll(async () => {
  await pool.query('delete from learning_node_drafts where node_id=any($1::uuid[])', [nodes]);
  await pool.query('delete from learning_tracks where id=any($1::uuid[])', [tracks]);
  await pool.query('delete from learning_banners where id=any($1::uuid[])', [banners]);
  await pool.query('delete from learning_resources where id=any($1::uuid[])', [resources]);
  await pool.end();
});
const kinds = [
  'track',
  'stage',
  'module',
  'lesson',
  'lesson-editor',
  'banner',
  'resource',
] as const;
for (const kind of kinds)
  test(`${kind}: salvar durante publicação cria rascunho sem alterar o publicado`, async () => {
    const id = randomUUID(),
      trackId = kind === 'track' ? id : randomUUID();
    const form = new FormData();
    form.set('title', 'Título alterado');
    form.set('description', 'Descrição alterada');
    form.set('position', '0');
    let table: string,
      parentId = '';
    nodes.push(id);
    if (kind === 'banner') {
      table = 'learning_banners';
      banners.push(id);
      await database.insert(schema.learningBanners).values({
        id,
        slug: id,
        title: 'Título publicado',
        description: 'Descrição',
        buttonLabel: 'Abrir',
        destination: '/sll',
      });
      for (const [key, value] of Object.entries({
        id,
        label: '',
        imageAlt: 'Imagem',
        buttonLabel: 'Abrir',
        destination: '/sll',
      }))
        form.set(key, value);
    } else if (kind === 'resource') {
      table = 'learning_resources';
      resources.push(id);
      await database.insert(schema.learningResources).values({
        id,
        slug: id,
        title: 'Título publicado',
        description: 'Descrição',
        groupKey: 'teste',
        groupTitle: 'Teste',
      });
      for (const [key, value] of Object.entries({
        id,
        groupTitle: 'Teste',
        groupKey: 'teste',
        buttonLabel: 'Abrir',
        destination: '/sll',
      }))
        form.set(key, value);
    } else {
      tracks.push(trackId);
      await database.insert(schema.learningTracks).values({
        id: trackId,
        slug: trackId,
        kind: 'complementary_course',
        title: 'Título publicado',
      });
      table = 'learning_tracks';
      if (kind !== 'track') {
        const stageId = kind === 'stage' ? id : randomUUID();
        await database
          .insert(schema.learningStages)
          .values({ id: stageId, trackId, slug: stageId, title: 'Título publicado' });
        parentId = trackId;
        table = 'learning_stages';
        if (kind !== 'stage') {
          const moduleId = kind === 'module' ? id : randomUUID();
          await database
            .insert(schema.learningModules)
            .values({ id: moduleId, stageId, slug: moduleId, title: 'Título publicado' });
          parentId = stageId;
          table = 'learning_modules';
          if (kind !== 'module') {
            await database
              .insert(schema.learningLessons)
              .values({ id, moduleId, slug: id, title: 'Título publicado' });
            parentId = moduleId;
            table = 'learning_lessons';
          }
        }
      }
      for (const [key, value] of Object.entries({
        nodeId: id,
        lessonId: id,
        kind: kind === 'lesson-editor' ? 'lesson' : kind,
        trackKind: 'complementary_course',
        parentId,
      }))
        form.set(key, value);
    }
    const blocker = await pool.connect();
    let pending: Promise<{ saved: boolean }> | undefined;
    try {
      await blocker.query('begin');
      // Segura a mudança de estado depois de outra requisição poder ter lido o rascunho.
      await blocker.query(`select id from ${table} where id=$1 for update`, [id]);
      const previous = { saved: false, message: '' };
      pending =
        kind === 'banner'
          ? saveSllBanner(previous, form)
          : kind === 'resource'
            ? saveSllResource(previous, form)
            : kind === 'lesson-editor'
              ? saveLearningLesson(previous, form)
              : saveLearningNode(previous, form);
      const deadline = Date.now() + 5000;
      let waiting = false;
      while (Date.now() < deadline) {
        if (
          (
            await pool.query(
              "select 1 from pg_stat_activity where application_name=$1 and wait_event in ('transactionid','advisory')",
              [applicationName],
            )
          ).rowCount
        ) {
          waiting = true;
          break;
        }
        await Bun.sleep(20);
      }
      expect(waiting).toBe(true);
      await blocker.query(`update ${table} set status='published' where id=$1`, [id]);
      await blocker.query('commit');
      expect((await pending).saved).toBe(true);
      expect(
        (await pool.query(`select title from ${table} where id=$1`, [id])).rows[0]?.title,
      ).toBe('Título publicado');
      expect(
        (await pool.query('select data from learning_node_drafts where node_id=$1', [id])).rows[0]
          ?.data.title,
      ).toBe('Título alterado');
    } finally {
      await blocker.query('rollback');
      blocker.release();
      await pending?.catch(() => {});
    }
  }, 15_000);
