import {
  and,
  asc,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  lte,
  notInArray,
  or,
  sql,
} from 'drizzle-orm';
import { requireAdmin } from '@/features/admin/server/access';
import { hasAdminRole } from '@/features/admin/access';
import { db } from '@/server/db';
import { leadActivities, leads, user } from '@/server/db/schema';
import { todayInBrazil, type LeadFilters } from '../model';

export const LEADS_PAGE_SIZE = 30;

export async function leadOptions() {
  await requireAdmin('/leads');
  const [accounts, sources] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, role: user.role })
      .from(user)
      // O banco já descarta as alunas (milhares de linhas); a função exata é conferida abaixo,
      // porque o Better Auth guarda várias funções separadas por vírgula.
      .where(and(or(isNull(user.banned), eq(user.banned, false)), ilike(user.role, '%admin%')))
      .orderBy(asc(user.name)),
    db.selectDistinct({ source: leads.source }).from(leads).orderBy(asc(leads.source)),
  ]);
  return { owners: accounts.filter((account) => hasAdminRole(account.role)), sources };
}

function leadWhere(filters: LeadFilters) {
  const pattern = `%${filters.q.replace(/[\\%_]/g, '\\$&')}%`;
  return and(
    filters.archived ? isNotNull(leads.archivedAt) : isNull(leads.archivedAt),
    filters.q
      ? or(
          ilike(leads.name, pattern),
          ilike(leads.email, pattern),
          ilike(leads.phone, pattern),
          sql`${leads.tags}::text ilike ${pattern}`,
        )
      : undefined,
    filters.stage ? eq(leads.stage, filters.stage as typeof leads.$inferSelect.stage) : undefined,
    filters.product
      ? eq(leads.product, filters.product as typeof leads.$inferSelect.product)
      : undefined,
    filters.source ? eq(leads.source, filters.source) : undefined,
    filters.owner === 'unassigned'
      ? isNull(leads.ownerId)
      : filters.owner
        ? eq(leads.ownerId, filters.owner)
        : undefined,
    filters.due
      ? and(lte(leads.nextContact, todayInBrazil()), notInArray(leads.stage, ['won', 'lost']))
      : undefined,
  );
}

export async function listLeads(filters: LeadFilters, exportAll = false) {
  await requireAdmin('/leads');
  const where = leadWhere(filters);
  const [count] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(leads)
    .where(where);
  const total = count?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / LEADS_PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const rows = await db
    .select({ lead: leads, ownerName: user.name })
    .from(leads)
    .leftJoin(user, eq(leads.ownerId, user.id))
    .where(where)
    .orderBy(
      ...(filters.due ? [asc(leads.nextContact), desc(leads.updatedAt)] : [desc(leads.updatedAt)]),
      asc(leads.id),
    )
    .limit(exportAll ? 10001 : LEADS_PAGE_SIZE)
    .offset(exportAll ? 0 : (page - 1) * LEADS_PAGE_SIZE);
  return { rows, total, page, pages };
}

export async function leadOverview() {
  await requireAdmin('/leads');
  const [stages, [due]] = await Promise.all([
    db
      .select({ stage: leads.stage, count: sql<number>`count(*)::int` })
      .from(leads)
      .where(isNull(leads.archivedAt))
      .groupBy(leads.stage),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(
        and(
          isNull(leads.archivedAt),
          lte(leads.nextContact, todayInBrazil()),
          notInArray(leads.stage, ['won', 'lost']),
        ),
      ),
  ]);
  const counts = Object.fromEntries(stages.map((stage) => [stage.stage, stage.count]));
  const total = stages.reduce((sum, stage) => sum + stage.count, 0);
  const won = counts.won ?? 0,
    closed = won + (counts.lost ?? 0);
  return {
    counts,
    total,
    due: due?.count ?? 0,
    won,
    conversion: closed ? Math.round((won / closed) * 100) : null,
  };
}

export async function getLead(id: string) {
  await requireAdmin(`/leads/${id}`);
  const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  if (!lead) return null;
  // O nome do responsável vem à parte: ele pode ter saído da equipe e não estar na lista ativa.
  const [owner] = lead.ownerId
    ? await db.select({ name: user.name }).from(user).where(eq(user.id, lead.ownerId)).limit(1)
    : [];
  const activities = await db
    .select({ activity: leadActivities, actorName: user.name })
    .from(leadActivities)
    .leftJoin(user, eq(leadActivities.actorId, user.id))
    .where(eq(leadActivities.leadId, id))
    .orderBy(desc(leadActivities.createdAt), desc(leadActivities.id))
    .limit(100);
  return { lead, activities, ownerName: owner?.name ?? null };
}
