'use server';

import { wholeNumberField } from '@/lib/form-number';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { revalidateSllContent } from '@/features/sll/server/content-cache';
import { unstable_rethrow } from 'next/navigation';
import { db } from '@/server/db';
import { learningTextDrafts, learningTextHistory, learningTexts } from '@/server/db/schema';
import { SLL_COPY, SLL_COPY_GROUPS } from '@/features/sll/copy';
import { parseEditorIntent } from '../editor-intent';
import { requireAdmin } from './access';

import type { EditorActionState, StructureActionState } from '../structure-types';

export async function saveSllCopy(
  _previous: { saved: boolean; message: string },
  form: FormData,
): Promise<{ saved: boolean; message: string }> {
  await requireAdmin();
  const groupIndex = wholeNumberField(form.get('groupIndex'));
  const group = groupIndex === undefined ? undefined : SLL_COPY_GROUPS[groupIndex];
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
    // O primeiro campo identifica o grupo; salvar, publicar e descartar usam o mesmo bloqueio.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${'sll-copy:' + group.fields[0]!.key}))`,
    );
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

type CopyGroup = (typeof SLL_COPY_GROUPS)[number];
const noGroup = { saved: false, message: 'Atualize a página e tente de novo.' };

type CopyKey = CopyGroup['fields'][number]['key'];
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Texto igual ao padrão não precisa de linha própria: apagar volta ao texto do código.
async function publishCopyText(tx: Transaction, key: CopyKey, value: string) {
  if (value === SLL_COPY[key]) {
    await tx.delete(learningTexts).where(eq(learningTexts.key, key));
    return;
  }
  await tx
    .insert(learningTexts)
    .values({ key, value })
    .onConflictDoUpdate({ target: learningTexts.key, set: { value } });
}

function copyGroup(form: FormData): CopyGroup | undefined {
  const groupIndex = wholeNumberField(form.get('groupIndex'));
  return groupIndex === undefined ? undefined : SLL_COPY_GROUPS[groupIndex];
}

/**
 * Troca os textos publicados do grupo pelos do rascunho (ou, ao voltar, pelos da versão
 * anterior) numa transação só. Ao voltar, nenhum rascunho é criado: se algo falhar, a tela
 * não fica com um rascunho que ninguém escreveu.
 */
async function publishCopyGroup(
  group: CopyGroup,
  source: 'draft' | 'history',
): Promise<StructureActionState> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${'sll-copy:' + group.fields[0]!.key}))`,
    );
    const drafts = await tx.query.learningTextDrafts.findMany();
    const history = await tx.query.learningTextHistory.findMany();
    const live = await tx.query.learningTexts.findMany();
    const draftByKey = new Map(drafts.map((draft) => [draft.key, draft.value]));
    const historyByKey = new Map(history.map((item) => [item.key, item.value]));
    const liveByKey = new Map(live.map((item) => [item.key, item.value]));
    if (source === 'history' && group.fields.some(({ key }) => draftByKey.has(key)))
      return {
        saved: false,
        message: 'Descarte ou publique o rascunho antes de voltar à versão anterior.',
      };
    const next = source === 'draft' ? draftByKey : historyByKey;
    if (!group.fields.every(({ key }) => next.has(key)))
      return {
        saved: false,
        message:
          source === 'draft'
            ? 'Salve o rascunho antes de publicar.'
            : 'Não há versão anterior destes textos.',
      };
    for (const { key } of group.fields) {
      const value = next.get(key)!;
      const previous = liveByKey.get(key) ?? SLL_COPY[key];
      await tx
        .insert(learningTextHistory)
        .values({ key, value: previous })
        .onConflictDoUpdate({ target: learningTextHistory.key, set: { value: previous } });
      await publishCopyText(tx, key, value);
      await tx.delete(learningTextDrafts).where(eq(learningTextDrafts.key, key));
    }
    return { saved: true, message: '' };
  });
}

function revalidateCopy() {
  revalidateSllContent();
  for (const path of ['/admin/textos', '/sll', '/sll/cursos', '/sll/recursos', '/sll/metodo'])
    revalidatePath(path);
}

export async function publishSllCopy(form: FormData): Promise<StructureActionState> {
  await requireAdmin();
  const group = copyGroup(form);
  if (!group) return noGroup;
  const result = await publishCopyGroup(group, 'draft');
  if (!result.saved) return result;
  revalidateCopy();
  return { saved: true, message: 'Textos publicados. As alunas já veem esta versão.' };
}

export async function restoreSllCopyVersion(form: FormData): Promise<StructureActionState> {
  await requireAdmin();
  const group = copyGroup(form);
  if (!group) return noGroup;
  const result = await publishCopyGroup(group, 'history');
  if (!result.saved) return result;
  revalidateCopy();
  return { saved: true, message: 'A versão anterior dos textos voltou para as alunas.' };
}

export async function discardSllCopyDraft(form: FormData): Promise<StructureActionState> {
  await requireAdmin();
  const group = copyGroup(form);
  if (!group) return noGroup;
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${'sll-copy:' + group.fields[0]!.key}))`,
    );
    for (const { key } of group.fields)
      await tx.delete(learningTextDrafts).where(eq(learningTextDrafts.key, key));
  });
  revalidatePath('/admin/textos');
  return { saved: true, message: 'Rascunho descartado. Os textos publicados continuam iguais.' };
}

/** Os botões abaixo do grupo mandam a ação em `intent`, com a resposta no mesmo estado. */
export async function runSllCopyAction(
  _previous: EditorActionState,
  form: FormData,
): Promise<EditorActionState> {
  const intent = parseEditorIntent(form.get('intent'));
  if (intent !== 'publish' && intent !== 'discard' && intent !== 'restore') return noGroup;
  try {
    const result =
      intent === 'publish'
        ? await publishSllCopy(form)
        : intent === 'discard'
          ? await discardSllCopyDraft(form)
          : await restoreSllCopyVersion(form);
    return { ...result, intent };
  } catch (error) {
    // Sessão vencida: o requireAdmin redireciona para a entrada, e isso não é uma falha.
    unstable_rethrow(error);
    return { saved: false, message: 'Não consegui concluir. Atualize a página e tente de novo.' };
  }
}
