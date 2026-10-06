'use server';

import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { hotmartEvents, hotmartProductMappings, hotmartSettings } from '@/server/db/schema';
import { requireAdmin } from '@/features/admin/server/access';
import { encryptHottok } from './secret';

export type SettingsResult = { message: string };

export async function saveHotmartSettings(
  _previous: SettingsResult,
  form: FormData,
): Promise<SettingsResult> {
  const session = await requireAdmin('/admin/hotmart');
  const token = form.get('token');
  const sllCode = form.get('sllCode');
  const storeCode = form.get('storeCode');
  if (typeof token !== 'string' || typeof sllCode !== 'string' || typeof storeCode !== 'string')
    return { message: 'Confira os campos.' };
  const sll = sllCode.trim();
  const store = storeCode.trim();
  if (!sll || !store || sll.length > 150 || store.length > 150)
    return { message: 'Informe os códigos dos dois produtos.' };
  const previous = await db.query.hotmartSettings.findFirst({
    where: eq(hotmartSettings.id, 'main'),
  });
  if (!previous && !token.trim()) return { message: 'Informe o token de verificação.' };
  if (token && (token.trim().length < 8 || token.trim().length > 500))
    return { message: 'O token precisa ter entre 8 e 500 caracteres.' };
  const currentMappings = await db.query.hotmartProductMappings.findMany();
  const changedMappings = currentMappings.some(
    (item) => (item.access === 'sll' ? sll : store) !== item.productUcode,
  );
  if (
    changedMappings &&
    (await db.query.hotmartPurchases.findFirst({ columns: { transaction: true } }))
  ) {
    return {
      message:
        'Já existem compras registradas. Para trocar o código de um produto, peça ajuda ao suporte para revisar os acessos anteriores.',
    };
  }
  await db.transaction(async (tx) => {
    if (token.trim()) {
      await tx
        .insert(hotmartSettings)
        .values({
          id: 'main',
          encryptedHottok: encryptHottok(token.trim()),
          updatedBy: session.user.id,
        })
        .onConflictDoUpdate({
          target: hotmartSettings.id,
          set: {
            encryptedHottok: encryptHottok(token.trim()),
            updatedBy: session.user.id,
            updatedAt: new Date(),
          },
        });
    }
    await tx.delete(hotmartProductMappings);
    await tx
      .insert(hotmartProductMappings)
      .values([
        { productUcode: sll, access: 'sll' },
        { productUcode: store, access: 'loja-pronta' },
      ])
      .onConflictDoNothing();
  });
  revalidatePath('/admin/hotmart');
  return { message: 'Configuração salva. Novos avisos já podem ser recebidos.' };
}

export async function getHotmartAdminState() {
  await requireAdmin('/admin/hotmart');
  const [settings, mappings, events] = await Promise.all([
    db.query.hotmartSettings.findFirst({
      columns: { id: true, updatedAt: true },
      where: eq(hotmartSettings.id, 'main'),
    }),
    db.query.hotmartProductMappings.findMany(),
    db.query.hotmartEvents.findMany({ orderBy: desc(hotmartEvents.receivedAt), limit: 20 }),
  ]);
  return { configured: Boolean(settings), updatedAt: settings?.updatedAt, mappings, events };
}
