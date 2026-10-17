import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { storeAutomationJobs, supplierFeedSubscriptions } from '@/server/db/schema';

export async function storeOperationOverview(userId: string) {
  const [brandJobs, feeds] = await Promise.all([
    db
      .select()
      .from(storeAutomationJobs)
      .where(and(eq(storeAutomationJobs.userId, userId), eq(storeAutomationJobs.kind, 'brand')))
      .orderBy(desc(storeAutomationJobs.createdAt))
      .limit(5),
    db.select().from(supplierFeedSubscriptions).where(eq(supplierFeedSubscriptions.userId, userId)),
  ]);
  return { brandJobs, feeds };
}
