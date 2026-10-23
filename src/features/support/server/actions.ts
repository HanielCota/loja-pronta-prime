'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/features/admin/server/access';
import { db } from '@/server/db';
import { supportContacts } from '@/server/db/schema';
import { parseSupportPhones, type SupportTopicId } from '../contacts';

export type SupportSettingsResult = {
  saved: boolean;
  message: string;
  field?: SupportTopicId;
};

export async function saveSupportContacts(
  _previous: SupportSettingsResult,
  form: FormData,
): Promise<SupportSettingsResult> {
  await requireAdmin('/admin/suporte');
  const parsed = parseSupportPhones(form);
  if (!parsed.ok) return { saved: false, message: parsed.message, field: parsed.field };
  await db.transaction(async (tx) => {
    for (const [topic, phone] of Object.entries(parsed.phones)) {
      await tx
        .insert(supportContacts)
        .values({ topic, phone })
        .onConflictDoUpdate({
          target: supportContacts.topic,
          set: { phone, updatedAt: new Date() },
        });
    }
  });
  revalidatePath('/admin/suporte');
  revalidatePath('/perfil');
  return { saved: true, message: 'Contatos de suporte salvos.' };
}
