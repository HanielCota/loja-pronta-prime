import { afterAll, beforeAll, expect, mock, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/server/db';
import * as s from '@/server/db/schema';
import { importZeCourse } from '@/features/ze-mauro/server/import-course';

const [zeId, priId, dualId, manualZeId] = Array.from({ length: 4 }, () => randomUUID());
const adminId = randomUUID();
const entitledAdminId = randomUUID();
let currentId = zeId!;
let sessionStatus = 'active';
let needsPassword = false;
const priTrackId = randomUUID();
const priStageId = randomUUID();
const priModuleId = randomUUID();
const priLessonId = randomUUID();
const priMaterialId = randomUUID();
const zeCode = randomUUID();
const priCode = randomUUID();
let zeTrackId = '';
let zeLessonId = '';
let zeMaterialId = '';

const session = () => ({
  user: {
    id: currentId,
    name: 'Course isolation',
    email: `${currentId}@example.invalid`,
    role: [adminId, entitledAdminId].includes(currentId) ? 'user,admin' : 'user',
    mustChangePassword: false,
  },
  session: { createdAt: new Date() },
});
mock.module('@/features/auth/server/session', () => ({
  getSessionState: async () => ({ status: sessionStatus, session: session() }),
  getActiveSession: async () => session(),
  needsFirstPassword: () => needsPassword,
}));
mock.module('next/server', () => ({ after: () => {} }));
mock.module('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
  unstable_rethrow: (error: unknown) => {
    throw error;
  },
}));
mock.module('next/cache', () => ({
  refresh: () => {},
  unstable_cache: (read: unknown) => read,
  revalidatePath: () => {},
  revalidateTag: () => {},
}));
mock.module('@/server/storage', () => ({
  storage: () => ({ stream: async () => ({ body: 'Authorized material', length: 19 }) }),
}));

const { requireProduct, requireProductAction } = await import('@/features/products/server/access');
const { getZeCourse } = await import('@/features/ze-mauro/server/catalog');
const { setZeLessonCompletion } = await import('@/features/ze-mauro/server/actions');
const { getStudentExperience } = await import('@/features/sll/server/experience');
const { getSllPublishedTracks } = await import('@/features/sll/server/catalog');
const { getPublishedSllTrack } = await import('@/features/sll/server/published-track');
const { setSllLessonCompletion } = await import('@/features/sll/server/progress-actions');
const { GET: material } = await import('@/app/api/sll/material/[blockId]/route');

beforeAll(async () => {
  for (const id of [zeId!, priId!, dualId!, manualZeId!]) {
    await db.insert(s.user).values({
      id,
      name: 'Course isolation',
      email: `${id}@example.invalid`,
      mustChangePassword: false,
    });
    await db.insert(s.studentProducts).values({ userId: id, product: 'sll' });
  }
  await db.insert(s.manualProductGrants).values([
    { userId: priId!, product: 'sll' },
    { userId: manualZeId!, product: 'sll' },
  ]);
  await db
    .insert(s.studentExperiences)
    .values({ userId: manualZeId!, expert: 'ze', manualExpert: 'ze' });
  for (const id of [adminId, entitledAdminId]) {
    await db.insert(s.user).values({
      id,
      name: 'Administrator preview',
      email: `${id}@example.invalid`,
      role: 'admin',
      mustChangePassword: false,
    });
  }
  await db.insert(s.studentProducts).values({ userId: entitledAdminId, product: 'sll' });
  await db.insert(s.manualProductGrants).values({ userId: entitledAdminId, product: 'sll' });
  await db.insert(s.studentExperiences).values({
    userId: entitledAdminId,
    expert: 'ze',
    manualExpert: 'ze',
  });
  await db.insert(s.hotmartProductMappings).values([
    { productUcode: zeCode, access: 'sll', expert: 'ze', primary: false },
    { productUcode: priCode, access: 'sll', expert: 'pri', primary: false },
  ]);
  for (const [id, code, expert] of [
    [zeId, zeCode, 'ze'],
    [dualId, zeCode, 'ze'],
    [dualId, priCode, 'pri'],
  ] as const) {
    await db.insert(s.hotmartPurchases).values({
      transaction: randomUUID(),
      buyerEmail: `${id}@example.invalid`,
      userId: id!,
      productUcode: code,
      expert,
      active: true,
      purchasedAt: new Date(Date.now() - 1000),
      expiresAt: new Date(Date.now() + 86400000),
      lastEventAt: new Date(),
    });
  }
  await db.insert(s.learningTracks).values({
    id: priTrackId,
    slug: `pri-${priTrackId}`,
    title: 'Pri private course',
    kind: 'complementary_course',
    status: 'published',
  });
  await db.insert(s.learningStages).values({
    id: priStageId,
    trackId: priTrackId,
    slug: 'stage',
    title: 'Stage',
    status: 'published',
  });
  await db.insert(s.learningModules).values({
    id: priModuleId,
    stageId: priStageId,
    slug: 'module',
    title: 'Module',
    status: 'published',
  });
  await db.insert(s.learningLessons).values({
    id: priLessonId,
    moduleId: priModuleId,
    slug: 'lesson',
    title: 'Pri private lesson',
    status: 'published',
  });
  await db.insert(s.learningContentBlocks).values({
    id: priMaterialId,
    lessonId: priLessonId,
    kind: 'file',
    data: {
      storageKey: 'private/pri.pdf',
      fileName: 'pri.pdf',
      contentType: 'application/pdf',
      size: 19,
    },
  });
});

afterAll(async () => {
  await db
    .delete(s.learningTracks)
    .where(inArray(s.learningTracks.id, [priTrackId, ...(zeTrackId ? [zeTrackId] : [])]));
  await db
    .delete(s.hotmartPurchases)
    .where(inArray(s.hotmartPurchases.productUcode, [zeCode, priCode]));
  await db
    .delete(s.hotmartProductMappings)
    .where(inArray(s.hotmartProductMappings.productUcode, [zeCode, priCode]));
  await db
    .delete(s.user)
    .where(inArray(s.user.id, [zeId!, priId!, dualId!, manualZeId!, adminId, entitledAdminId]));
  await db.$client.end();
});

test('Zé course import is atomic, repeatable and preserves administrator edits', async () => {
  expect(await importZeCourse(db.$client, undefined, true)).toEqual({
    tracks: 1,
    lessons: 65,
    videos: 57,
    pending: 8,
  });
  expect(
    await db.query.learningTracks.findFirst({ where: eq(s.learningTracks.slug, 'ze-mauro') }),
  ).toBeUndefined();
  expect(await importZeCourse(db.$client)).toEqual({
    tracks: 1,
    lessons: 65,
    videos: 57,
    pending: 8,
  });
  const { course } = await getZeCourse();
  zeTrackId = course!.id;
  zeLessonId = course!.stages[0]!.modules[0]!.lessons[0]!.id;
  expect(course!.expert).toBe('ze');
  await db
    .update(s.learningLessons)
    .set({ title: 'Edited lesson' })
    .where(eq(s.learningLessons.id, zeLessonId));
  expect(await importZeCourse(db.$client)).toEqual({
    tracks: 0,
    lessons: 0,
    videos: 0,
    pending: 0,
  });
  expect(
    (await db.query.learningLessons.findFirst({ where: eq(s.learningLessons.id, zeLessonId) }))!
      .title,
  ).toBe('Edited lesson');
  const [file] = await db
    .insert(s.learningContentBlocks)
    .values({
      lessonId: zeLessonId,
      kind: 'file',
      data: {
        storageKey: 'private/ze.pdf',
        fileName: 'ze.pdf',
        contentType: 'application/pdf',
        size: 19,
      },
    })
    .returning({ id: s.learningContentBlocks.id });
  zeMaterialId = file!.id;
});

test('Zé course pages, actions and catalogs enforce both directions of isolation', async () => {
  currentId = zeId!;
  expect((await getStudentExperience(currentId)).allowed).toEqual(['ze']);
  await expect(requireProduct('sll')).rejects.toThrow('redirect:/ze-mauro');
  await expect(requireProductAction('sll')).rejects.toThrow('redirect:/');
  expect((await getZeCourse()).course?.id).toBe(zeTrackId);
  currentId = priId!;
  await expect(getZeCourse()).rejects.toThrow('redirect:/sll');
  await expect(requireProductAction('sll', 'ze')).rejects.toThrow('redirect:/');
  expect((await getSllPublishedTracks()).map((track) => track.id)).not.toContain(zeTrackId);
  expect(await getPublishedSllTrack(zeTrackId)).toBeUndefined();
  currentId = dualId!;
  await requireProduct('sll');
  await requireProduct('sll', '/ze-mauro', 'ze');
  currentId = manualZeId!;
  expect((await getStudentExperience(currentId)).allowed).toEqual(['ze']);
  await expect(requireProduct('sll')).rejects.toThrow('redirect:/ze-mauro');
});

test('Zé course completion rejects foreign lessons and keeps progress private', async () => {
  currentId = zeId!;
  const form = new FormData();
  form.set('lessonId', priLessonId);
  form.set('completed', 'true');
  await expect(setZeLessonCompletion(form)).rejects.toThrow('redirect:/ze-mauro?resultado=invalid');
  form.set('lessonId', zeLessonId);
  await expect(setZeLessonCompletion(form)).rejects.toThrow(
    `redirect:/ze-mauro/aula/${zeLessonId}?resultado=saved`,
  );
  expect((await getZeCourse()).completed.has(zeLessonId)).toBe(true);
  currentId = dualId!;
  expect((await getZeCourse()).completed.has(zeLessonId)).toBe(false);
  expect((await setSllLessonCompletion(zeTrackId, zeLessonId, true)).saved).toBe(false);
  currentId = zeId!;
  form.set('completed', 'false');
  await expect(setZeLessonCompletion(form)).rejects.toThrow('resultado=saved');
  expect((await getZeCourse()).completed.has(zeLessonId)).toBe(false);
});

test('administrator preview needs an active account but no student entitlement', async () => {
  currentId = adminId;
  const preview = await getZeCourse();
  expect(preview.preview).toBe(true);
  expect(preview.course?.id).toBe(zeTrackId);
  expect(preview.hasPri).toBe(false);
  expect(preview.products).toEqual([]);
  expect(preview.completed.size).toBe(0);
  await expect(requireProductAction('sll', 'ze')).rejects.toThrow('redirect:/');
  expect(
    await db.query.studentProducts.findMany({ where: eq(s.studentProducts.userId, adminId) }),
  ).toEqual([]);
  try {
    sessionStatus = 'none';
    await expect(getZeCourse()).rejects.toThrow('redirect:/entrar?next=%2Fze-mauro');
    sessionStatus = 'banned';
    await expect(getZeCourse()).rejects.toThrow('redirect:/entrar?motivo=conta-desativada');
    sessionStatus = 'active';
    needsPassword = true;
    await expect(getZeCourse()).rejects.toThrow('redirect:/primeiro-acesso?next=%2Fze-mauro');
  } finally {
    sessionStatus = 'active';
    needsPassword = false;
  }
});

test('administrator preview hides progress and rejects completion even with a Ze entitlement', async () => {
  currentId = entitledAdminId;
  await db.insert(s.learningLessonProgress).values({
    userId: currentId,
    lessonId: zeLessonId,
    completedAt: new Date(),
  });
  expect((await getZeCourse()).completed.size).toBe(0);
  const form = new FormData();
  form.set('lessonId', zeLessonId);
  form.set('completed', 'false');
  await expect(setZeLessonCompletion(form)).rejects.toThrow('redirect:/ze-mauro');
  expect(
    (
      await db.query.learningLessonProgress.findFirst({
        where: eq(s.learningLessonProgress.userId, currentId),
      })
    )?.completedAt,
  ).not.toBeNull();
  expect(
    await db.query.learningTrackProgress.findMany({
      where: eq(s.learningTrackProgress.userId, currentId),
    }),
  ).toEqual([]);
});

test('Zé course materials reject cross-course downloads before reaching storage', async () => {
  const request = new Request('http://localhost/api/sll/material/test');
  currentId = zeId!;
  expect(
    (await material(request, { params: Promise.resolve({ blockId: priMaterialId }) })).status,
  ).toBe(404);
  expect(
    (await material(request, { params: Promise.resolve({ blockId: zeMaterialId }) })).status,
  ).toBe(200);
  currentId = priId!;
  expect(
    (await material(request, { params: Promise.resolve({ blockId: zeMaterialId }) })).status,
  ).toBe(404);
  expect(
    (await material(request, { params: Promise.resolve({ blockId: priMaterialId }) })).status,
  ).toBe(200);
});
