import { db } from '@/server/db';
import { SUPPORT_CONTACTS, type SupportPhones } from '../contacts';

export async function getSupportPhones(): Promise<SupportPhones> {
  const rows = await db.query.supportContacts.findMany();
  return Object.fromEntries(
    // Os números antigos de aulas e envio não pertencem às novas responsáveis.
    SUPPORT_CONTACTS.map(({ id }) => [id, rows.find((row) => row.topic === id)?.phone ?? '']),
  ) as SupportPhones;
}
