import { asc } from 'drizzle-orm';
import { db } from '@/server/db';
import { supportSituations, supportTopics } from '@/server/db/schema';
import {
  DEFAULT_SUPPORT_CATALOG,
  SUPPORT_TICKET_TOPICS,
  type SupportSituation,
  type SupportTicketTopic,
  type SupportTopic,
} from '../catalog';

let seeded = false;

/**
 * Grava os temas e situações de fábrica que ainda não estão no banco. `on conflict do nothing`:
 * o que o admin mudou fica como ele deixou; tema ou situação novos no código aparecem sozinhos.
 */
async function ensureCatalog() {
  if (seeded) return;
  await db.transaction(async (tx) => {
    await tx
      .insert(supportTopics)
      .values(
        DEFAULT_SUPPORT_CATALOG.map((topic, position) => ({
          id: topic.id,
          label: topic.label,
          question: topic.question,
          example: topic.example,
          position,
          active: topic.active,
        })),
      )
      .onConflictDoNothing();
    const situations = DEFAULT_SUPPORT_CATALOG.flatMap((topic) =>
      topic.situations.map((item, position) => ({
        topicId: topic.id,
        id: item.id,
        label: item.label,
        legend: item.legend,
        priority: item.priority,
        question: item.question,
        example: item.example,
        attachmentTip: item.attachmentTip,
        notice: item.notice,
        position,
        active: item.active,
      })),
    );
    if (situations.length) await tx.insert(supportSituations).values(situations).onConflictDoNothing();
  });
  seeded = true;
}

function isTicketTopic(value: string): value is SupportTicketTopic {
  return (SUPPORT_TICKET_TOPICS as readonly string[]).includes(value);
}

/** O catálogo como está no banco, com as regras fixas (fila, sempre pra uma pessoa) do código. */
export async function loadSupportCatalog(): Promise<SupportTopic[]> {
  await ensureCatalog();
  const [topics, situations] = await Promise.all([
    db.select().from(supportTopics).orderBy(asc(supportTopics.position)),
    db.select().from(supportSituations).orderBy(asc(supportSituations.position)),
  ]);
  return topics.flatMap((row) => {
    if (!isTicketTopic(row.id)) return [];
    const fixed = DEFAULT_SUPPORT_CATALOG.find((topic) => topic.id === row.id);
    if (!fixed) return [];
    const topicSituations: SupportSituation[] = situations
      .filter((item) => item.topicId === row.id)
      .map((item) => ({
        id: item.id,
        label: item.label,
        legend: item.legend,
        priority: item.priority,
        question: item.question,
        example: item.example,
        attachmentTip: item.attachmentTip,
        notice: item.notice,
        active: item.active,
      }));
    return [
      {
        id: row.id,
        label: row.label,
        question: row.question,
        example: row.example,
        queue: fixed.queue,
        alwaysHuman: fixed.alwaysHuman,
        defaultAssigneeId: row.defaultAssigneeId,
        active: row.active,
        situations: topicSituations,
      },
    ];
  });
}

/** Rótulo do tema pelo id (pra frases de evento e listas). */
export function topicLabeler(catalog: readonly SupportTopic[]) {
  return (id: string) => catalog.find((topic) => topic.id === id)?.label ?? 'Outra coisa';
}
