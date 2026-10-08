'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/features/admin/server/access';
import { hasAdminRole } from '@/features/admin/access';
import { db } from '@/server/db';
import { leadActivities, leads, user } from '@/server/db/schema';
import {
  EMPTY_LEAD,
  LEAD_FIELDS,
  leadSchema,
  leadRecord,
  stageLabels,
  type LeadInput,
  type LeadValues,
} from '../model';
import { MAX_IMPORT_ROWS, readLeadCsv } from '../csv';

export type LeadFormState = {
  attempt: number;
  values?: LeadValues;
  errors?: Partial<Record<keyof LeadInput, string>>;
  message?: string;
  saved?: boolean;
};
export type ImportState = {
  message?: string;
  errors?: string[];
  preview?: LeadInput[];
  imported?: number;
  skipped?: number;
};

async function validOwner(id: string): Promise<boolean> {
  if (!id) return true;
  const [owner] = await db
    .select({ role: user.role, banned: user.banned })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);
  return Boolean(owner && !owner.banned && hasAdminRole(owner.role));
}

function reportWriteError(error: unknown): string {
  let current: unknown = error;
  for (let i = 0; i < 4 && current && typeof current === 'object'; i++) {
    if ('code' in current && current.code === '23505')
      return 'Esse email ou WhatsApp já está cadastrado, inclusive nos arquivados. Busque o contato antes de continuar.';
    current = 'cause' in current ? current.cause : undefined;
  }
  // Não registra dados pessoais nem a consulta que falhou.
  console.error('[leads] Não foi possível gravar o contato.');
  return 'Não foi possível salvar agora. Tente de novo.';
}

export async function saveLead(state: LeadFormState, form: FormData): Promise<LeadFormState> {
  const session = await requireAdmin('/leads');
  const values = Object.fromEntries(
    LEAD_FIELDS.map((field) => [
      field,
      typeof form.get(field) === 'string' ? form.get(field) : EMPTY_LEAD[field],
    ]),
  ) as LeadValues;
  const attempt = state.attempt + 1;
  const parsed = leadSchema.safeParse(values);
  if (!parsed.success)
    return {
      attempt,
      values,
      errors: Object.fromEntries(
        parsed.error.issues.map((issue) => [issue.path[0], issue.message]),
      ),
      message: 'Confira os campos indicados.',
    };
  if (!(await validOwner(parsed.data.ownerId)))
    return { attempt, values, errors: { ownerId: 'Escolha uma administradora ativa.' } };
  const idValue = form.get('id');
  const editing = typeof idValue === 'string' && Boolean(idValue);
  const id = editing ? (idValue as string) : crypto.randomUUID();
  try {
    const result = await db.transaction(async (tx) => {
      if (editing) {
        const [before] = await tx
          .select()
          .from(leads)
          .where(eq(leads.id, id))
          .for('update')
          .limit(1);
        if (!before || before.archivedAt) return 'Esse contato está arquivado ou não existe mais.';
        if (before.updatedAt.toISOString() !== form.get('version'))
          return 'Esse contato mudou em outra tela. Recarregue a página para conferir os dados antes de salvar.';
        const data = leadRecord(parsed.data);
        const changes = LEAD_FIELDS.filter(
          (field) => JSON.stringify(before[field]) !== JSON.stringify(data[field]),
        );
        if (!changes.length) return undefined;
        const labels: Record<keyof LeadInput, string> = {
          name: 'nome',
          email: 'email',
          phone: 'WhatsApp',
          stage: 'etapa',
          product: 'produto de interesse',
          source: 'origem',
          ownerId: 'responsável',
          nextContact: 'próximo contato',
          tags: 'etiquetas',
          lostReason: 'motivo da perda',
        };
        const body =
          before.stage !== data.stage
            ? `Etapa: ${stageLabels[before.stage]} → ${stageLabels[data.stage]}. Dados atualizados: ${changes.map((field) => labels[field]).join(', ')}.`
            : `Dados atualizados: ${changes.map((field) => labels[field]).join(', ')}.`;
        await tx
          .update(leads)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(leads.id, id));
        await tx.insert(leadActivities).values({
          id: crypto.randomUUID(),
          leadId: id,
          actorId: session.user.id,
          kind: 'updated',
          body,
        });
      } else {
        await tx.insert(leads).values({ id, ...leadRecord(parsed.data) });
        await tx.insert(leadActivities).values({
          id: crypto.randomUUID(),
          leadId: id,
          actorId: session.user.id,
          kind: 'created',
          body: 'Contato cadastrado manualmente.',
        });
      }
      return undefined;
    });
    if (result) return { attempt, values, message: result };
  } catch (error) {
    return { attempt, values, message: reportWriteError(error) };
  }
  revalidatePath('/leads');
  redirect(`/leads/${id}?salvo=sim`);
}

export async function addLeadNote(_state: { message?: string; saved?: boolean }, form: FormData) {
  const session = await requireAdmin('/leads');
  const id = String(form.get('id') ?? '');
  const note = String(form.get('note') ?? '').trim();
  if (!note || note.length > 3000)
    return { message: 'Escreva uma anotação com até 3.000 caracteres.', saved: false };
  try {
    const result = await db.transaction(async (tx) => {
      const [lead] = await tx.select().from(leads).where(eq(leads.id, id)).for('update').limit(1);
      if (!lead || lead.archivedAt) return false;
      await tx.insert(leadActivities).values({
        id: crypto.randomUUID(),
        leadId: id,
        actorId: session.user.id,
        kind: 'note',
        body: note,
      });
      await tx.update(leads).set({ updatedAt: new Date() }).where(eq(leads.id, id));
      return true;
    });
    if (!result) return { message: 'Restaure o contato antes de anotar.', saved: false };
  } catch {
    return { message: 'Não foi possível salvar a anotação. Tente de novo.', saved: false };
  }
  revalidatePath(`/leads/${id}`);
  revalidatePath('/leads');
  return { message: 'Anotação salva.', saved: true };
}

export async function archiveLead(form: FormData) {
  const session = await requireAdmin('/leads');
  const id = String(form.get('id') ?? '');
  const restore = form.get('restore') === 'yes';
  await db.transaction(async (tx) => {
    const [lead] = await tx.select().from(leads).where(eq(leads.id, id)).for('update').limit(1);
    if (!lead || Boolean(lead.archivedAt) === !restore) return;
    await tx
      .update(leads)
      .set({ archivedAt: restore ? null : new Date(), updatedAt: new Date() })
      .where(eq(leads.id, id));
    await tx.insert(leadActivities).values({
      id: crypto.randomUUID(),
      leadId: id,
      actorId: session.user.id,
      kind: restore ? 'restored' : 'archived',
      body: restore ? 'Contato restaurado.' : 'Contato arquivado.',
    });
  });
  revalidatePath('/leads');
  redirect(`/leads/${id}`);
}

export async function importLeads(_state: ImportState, form: FormData): Promise<ImportState> {
  const session = await requireAdmin('/leads/importar');
  if (form.get('confirm') !== 'yes') {
    const file = form.get('file');
    if (
      !(file instanceof File) ||
      !file.size ||
      file.size > 2 * 1024 * 1024 ||
      !file.name.toLowerCase().endsWith('.csv')
    )
      return { message: 'Escolha um arquivo CSV de até 2 MB.' };
    try {
      const parsed = readLeadCsv(await file.text());
      if (parsed.errors.length)
        return {
          message: 'Corrija a planilha e envie de novo. Nenhum contato foi importado.',
          errors: parsed.errors,
        };
      return { preview: parsed.leads };
    } catch (error) {
      return {
        message: error instanceof Error ? error.message : 'Não foi possível ler o arquivo.',
      };
    }
  }
  const payload = form.get('payload');
  const ownerId = String(form.get('ownerId') ?? '');
  if (!(await validOwner(ownerId))) return { message: 'Escolha uma administradora ativa.' };
  let inputs: LeadInput[];
  try {
    if (typeof payload !== 'string' || payload.length > 2 * 1024 * 1024) throw new Error();
    const rows: unknown = JSON.parse(payload);
    if (!Array.isArray(rows) || !rows.length || rows.length > MAX_IMPORT_ROWS) throw new Error();
    inputs = rows.map((row: unknown) =>
      leadSchema.parse({ ...(row as Record<string, unknown>), ownerId }),
    );
  } catch {
    return { message: 'A prévia não é válida. Envie o arquivo de novo.' };
  }
  try {
    const imported = await db.transaction(async (tx) => {
      // Cada conflito é ignorado pelos índices; um reenvio não duplica nem sobrescreve contatos.
      let created = 0;
      for (const input of inputs) {
        const [record] = await tx
          .insert(leads)
          .values({ id: crypto.randomUUID(), ...leadRecord(input) })
          .onConflictDoNothing()
          .returning({ id: leads.id });
        if (!record) continue;
        await tx.insert(leadActivities).values({
          id: crypto.randomUUID(),
          leadId: record.id,
          actorId: session.user.id,
          kind: 'created',
          body: 'Contato importado por planilha.',
        });
        created++;
      }
      return created;
    });
    revalidatePath('/leads');
    return { imported, skipped: inputs.length - imported, message: 'Importação concluída.' };
  } catch (error) {
    return { preview: inputs, message: reportWriteError(error) };
  }
}
