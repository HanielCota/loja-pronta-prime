import { db } from '@/server/db';
import { SUPPORT_TOPICS, type SupportPhones } from '../contacts';

export async function getSupportPhones(): Promise<SupportPhones> {
  const rows = await db.query.supportContacts.findMany();
  return Object.fromEntries(
    SUPPORT_TOPICS.map(({ id }) => [id, rows.find((row) => row.topic === id)?.phone ?? '']),
  ) as SupportPhones;
}
