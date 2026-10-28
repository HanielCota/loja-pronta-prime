'use server';

import { runAsStudent } from './impersonation';
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
  revalidatePath('/admin/suporte/configuracoes');
  revalidatePath('/perfil');
  revalidatePath('/suporte/acesso');
  return { saved: true, message: 'Contatos de suporte salvos.' };
}

export type TicketActionState = { ok: boolean; message: string };

const retired: TicketActionState = {
  ok: false,
  message: 'O atendimento agora é pelo WhatsApp. Acesse a ajuda no seu perfil.',
};

export async function closeTicketAction(
  _state: TicketActionState,
  _form: FormData,
): Promise<TicketActionState> {
  return runAsStudent('closeTicketAction', async () => retired);
}

export async function resolveTicketAction(
  _state: TicketActionState,
  _form: FormData,
): Promise<TicketActionState> {
  return runAsStudent('resolveTicketAction', async () => retired);
}

export async function undoCloseAction(
  _state: TicketActionState,
  _form: FormData,
): Promise<TicketActionState> {
  return runAsStudent('undoCloseAction', async () => retired);
}

export async function notResolvedAction(
  _state: TicketActionState,
  _form: FormData,
): Promise<TicketActionState> {
  return runAsStudent('notResolvedAction', async () => retired);
}

export async function rateAction(
  _state: TicketActionState,
  _form: FormData,
): Promise<TicketActionState> {
  return runAsStudent('rateAction', async () => retired);
}

export async function emailRepliesAction(
  _state: TicketActionState,
  _form: FormData,
): Promise<TicketActionState> {
  return runAsStudent('emailRepliesAction', async () => retired);
}

export async function markMyTicketRead(_number: number, _messageId: string): Promise<void> {
  return runAsStudent('markMyTicketRead', async () => {});
}

export async function faqFeedbackAction(
  _answerId: string,
  _topicId: string,
  _situationId: string | null,
  _resolved: boolean,
): Promise<void> {
  return runAsStudent('faqFeedbackAction', async () => {});
}

export async function getMyUnreadSupportCount(): Promise<number> {
  return runAsStudent('getMyUnreadSupportCount', async () => 0);
}
