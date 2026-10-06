'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { learningTextDrafts, learningTextHistory, learningTexts } from '@/server/db/schema';
import { SLL_COPY, SLL_COPY_GROUPS } from '@/features/sll/copy';
import { requireAdmin } from './access';

export async function saveSllCopy(
  _previous: { saved: boolean; message: string },
  form: FormData,
): Promise<{ saved: boolean; message: string }> {
  await requireAdmin();
  const groupIndex = Number(form.get('groupIndex'));
  const group = Number.isInteger(groupIndex) ? SLL_COPY_GROUPS[groupIndex] : undefined;
  if (!group) return { saved: false, message: 'Escolha um grupo de textos.' };
  const values = group.fields.map(({ key }) => ({ key, value: form.get(key) }));
  if (
    values.some(
      ({ value }) => typeof value !== 'string' || !value.trim() || value.trim().length > 600,
    )
  ) {
    return { saved: false, message: 'Preencha todos os textos com até 600 caracteres.' };
  }
  await db.transaction(async (tx) => {
    for (const { key, value } of values) {
      const text = String(value).trim();
      await tx
        .insert(learningTextDrafts)
        .values({ key, value: text })
        .onConflictDoUpdate({ target: learningTextDrafts.key, set: { value: text } });
    }
  });
  revalidatePath('/admin/textos');
  return { saved: true, message: 'Rascunho salvo. Publique quando estiver pronto.' };
}

export async function publishSllCopy(form: FormData): Promise<void> {
  await requireAdmin();
  const groupIndex = Number(form.get('groupIndex'));
  const group = Number.isInteger(groupIndex) ? SLL_COPY_GROUPS[groupIndex] : undefined;
  if (!group) return;
  const drafts = await db.query.learningTextDrafts.findMany();
  const byKey = new Map(drafts.map((draft) => [draft.key, draft.value]));
  if (!group.fields.every(({ key }) => byKey.has(key))) return;
  const live = await db.query.learningTexts.findMany();
  const liveByKey = new Map(live.map((item) => [item.key, item.value]));
  await db.transaction(async (tx) => {
    for (const { key } of group.fields) {
      const value = byKey.get(key)!;
      const previous = liveByKey.get(key) ?? SLL_COPY[key];
      await tx
        .insert(learningTextHistory)
        .values({ key, value: previous })
        .onConflictDoUpdate({ target: learningTextHistory.key, set: { value: previous } });
      if (value === SLL_COPY[key]) await tx.delete(learningTexts).where(eq(learningTexts.key, key));
      else
        await tx
          .insert(learningTexts)
          .values({ key, value })
          .onConflictDoUpdate({ target: learningTexts.key, set: { value } });
      await tx.delete(learningTextDrafts).where(eq(learningTextDrafts.key, key));
    }
  });
  for (const path of ['/admin/textos', '/sll', '/sll/cursos', '/sll/recursos', '/sll/metodo'])
    revalidatePath(path);
}

export async function restoreSllCopyVersion(form: FormData): Promise<void> {
  await requireAdmin();
  const groupIndex = Number(form.get('groupIndex'));
  const group = Number.isInteger(groupIndex) ? SLL_COPY_GROUPS[groupIndex] : undefined;
  if (!group) return;
  const [drafts, history] = await Promise.all([
    db.query.learningTextDrafts.findMany(),
    db.query.learningTextHistory.findMany(),
  ]);
  const draftKeys = new Set(drafts.map((item) => item.key));
  const previous = new Map(history.map((item) => [item.key, item.value]));
  if (group.fields.some(({ key }) => draftKeys.has(key) || !previous.has(key))) return;
  await db.transaction(async (tx) => {
    for (const { key } of group.fields) {
      const value = previous.get(key)!;
      await tx
        .insert(learningTextDrafts)
        .values({ key, value })
        .onConflictDoUpdate({ target: learningTextDrafts.key, set: { value } });
    }
  });
  await publishSllCopy(form);
}

export async function discardSllCopyDraft(form: FormData): Promise<void> {
  await requireAdmin();
  const groupIndex = Number(form.get('groupIndex'));
  const group = Number.isInteger(groupIndex) ? SLL_COPY_GROUPS[groupIndex] : undefined;
  if (!group) return;
  await db.transaction(async (tx) => {
    for (const { key } of group.fields)
      await tx.delete(learningTextDrafts).where(eq(learningTextDrafts.key, key));
  });
  revalidatePath('/admin/textos');
}
