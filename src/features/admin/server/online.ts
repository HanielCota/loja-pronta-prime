import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { learningLessons, user, userPresence } from '@/server/db/schema';
import { describeDevice } from '@/features/presence/device';
import { describePresence, ONLINE_WINDOW_MS } from '@/features/presence/presence';
import type { DeviceClient } from '@/features/presence/device';
import type { PresenceRow } from '../components/presence-table';
import { requireAdmin } from './access';
import { visiblePresenceCondition } from './presence-visibility';

/** Põe o título da aula nas linhas que estão numa aula (uma consulta só pra todas). */
async function withLessonTitles(
  rows: {
    userId: string;
    name: string;
    email: string;
    path: string;
    lastSeenAt: Date;
    userAgent: string | null;
    device: DeviceClient | null;
  }[],
): Promise<PresenceRow[]> {
  const places = rows.map((row) => ({ row, place: describePresence(row.path) }));
  const lessonIds = [...new Set(places.flatMap(({ place }) => place.lessonId ?? []))];
  const lessons = lessonIds.length
    ? await db
        .select({ id: learningLessons.id, title: learningLessons.title })
        .from(learningLessons)
        .where(inArray(learningLessons.id, lessonIds))
    : [];
  return places.map(({ row, place }) => ({
    ...place,
    userId: row.userId,
    name: row.name,
    email: row.email,
    lastSeenAt: row.lastSeenAt,
    // Avisos antigos (de antes do aparelho existir) não têm nada: melhor "sem informação".
    device: row.userAgent || row.device ? describeDevice(row.userAgent, row.device ?? {}) : null,
    deviceClient: row.device ?? {},
    lessonTitle: lessons.find((lesson) => lesson.id === place.lessonId)?.title ?? null,
  }));
}

const presenceColumns = {
  userId: userPresence.userId,
  name: user.name,
  email: user.email,
  path: userPresence.path,
  lastSeenAt: userPresence.lastSeenAt,
  userAgent: userPresence.userAgent,
  device: userPresence.device,
};

/** A lista mostra no máximo estas pessoas; o total vem de uma contagem à parte. */
export const ONLINE_LIST_LIMIT = 500;

/** Quem avisou dentro da janela de online e pode aparecer pra equipe (lista e contagem usam o mesmo). */
function onlineCondition(now: Date) {
  return and(
    gte(userPresence.lastSeenAt, new Date(now.getTime() - ONLINE_WINDOW_MS)),
    visiblePresenceCondition(),
  );
}

/** Quantas pessoas estão online, sem o teto da lista (o número do menu e dos títulos). */
export async function countOnlineStudents(now: Date): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(userPresence)
    .innerJoin(user, eq(userPresence.userId, user.id))
    .where(onlineCondition(now));
  return row?.total ?? 0;
}

/**
 * Quem avisou nos últimos 90 segundos, do aviso mais novo ao mais velho (até ONLINE_LIST_LIMIT),
 * e o total de verdade: acima do teto, a tela dizia "500 pessoas online" enquanto o menu contava
 * todas. Devolve também a hora da leitura, que as telas usam pra dizer "há quanto tempo".
 */
export async function getOnlineStudents(): Promise<{
  now: Date;
  rows: PresenceRow[];
  total: number;
}> {
  await requireAdmin('/admin/online');
  const now = new Date();
  const [rows, total] = await Promise.all([
    db
      .select(presenceColumns)
      .from(userPresence)
      .innerJoin(user, eq(userPresence.userId, user.id))
      .where(onlineCondition(now))
      .orderBy(desc(userPresence.lastSeenAt))
      .limit(ONLINE_LIST_LIMIT),
    countOnlineStudents(now),
  ]);
  // A contagem roda separada; quem entrou entre as duas leituras não deixa o total menor que a lista.
  return { now, rows: await withLessonTitles(rows), total: Math.max(total, rows.length) };
}

/** O último lugar em que uma conta esteve (null se nunca abriu as áreas), e a hora da leitura. */
export async function getLastPresence(
  userId: string,
): Promise<{ now: Date; presence: PresenceRow | null }> {
  await requireAdmin(`/admin/contas/${userId}`);
  const rows = await db
    .select(presenceColumns)
    .from(userPresence)
    .innerJoin(user, eq(userPresence.userId, user.id))
    .where(and(eq(userPresence.userId, userId), visiblePresenceCondition()))
    .limit(1);
  const [row] = await withLessonTitles(rows);
  return { now: new Date(), presence: row ?? null };
}
