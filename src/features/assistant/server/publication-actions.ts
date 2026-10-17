'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireProductAction } from '@/features/products/server/access';
import { reauthorizePublicationItem } from './corrections';
import { publicationSelectionSchema } from '../publication-selection';
import { createPublicationBatch } from './operations';

export async function submitPublicationBatch(form: FormData): Promise<void> {
  const { userId } = await requireProductAction('loja-pronta');
  const kind = form.get('kind') === 'expansion' ? 'expansion' : 'initial';
  const parsed = z
    .array(
      z
        .string()
        .max(2000)
        .transform((value, ctx) => {
          try {
            return publicationSelectionSchema.parse(JSON.parse(value));
          } catch {
            ctx.addIssue({ code: 'custom', message: 'Seleção inválida.' });
            return z.NEVER;
          }
        }),
    )
    .max(50)
    .safeParse(form.getAll('product'));
  if (!parsed.success) redirect('/loja-pronta/produtos?resultado=invalid');
  try {
    await createPublicationBatch(
      userId,
      parsed.data,
      form.get('strategy') === 'niche' ? 'niche' : 'varied',
      kind,
    );
  } catch {
    redirect('/loja-pronta/produtos?resultado=unavailable');
  }
  revalidatePath('/loja-pronta/produtos');
  redirect('/loja-pronta/produtos?resultado=queued');
}

export async function confirmPublicationCorrection(form: FormData): Promise<void> {
  const { userId } = await requireProductAction('loja-pronta');
  const id = z.uuid().safeParse(form.get('itemId'));
  const expected = String(form.get('fingerprint') ?? '');
  if (!id.success || !/^[a-f0-9]{64}$/.test(expected))
    redirect('/loja-pronta/produtos?resultado=invalid');
  let saved = false;
  try {
    saved = await reauthorizePublicationItem(userId, id.data, expected);
  } catch {
    /* Sem erro externo na interface. */
  }
  revalidatePath('/loja-pronta/produtos');
  redirect(`/loja-pronta/produtos?resultado=${saved ? 'queued' : 'unavailable'}`);
}
