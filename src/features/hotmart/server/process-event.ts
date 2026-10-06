import { randomBytes } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { auth } from '@/server/auth/auth';
import {
  hotmartEvents,
  hotmartProductMappings,
  hotmartPurchases,
  manualProductGrants,
  studentProducts,
  user,
} from '@/server/db/schema';
import type { ProductId } from '@/config/products';
import { purchaseEffect, shouldApplyEvent, type HotmartPurchaseEvent } from '../event';

async function findOrCreateBuyer(email: string, name: string) {
  const existing = await db.query.user.findFirst({
    columns: { id: true },
    where: eq(user.email, email),
  });
  if (existing) return existing.id;
  try {
    const created = await auth.api.createUser({
      body: {
        email,
        name,
        password: randomBytes(48).toString('base64url'),
        role: 'user',
        data: { emailVerified: true, mustChangePassword: false },
      },
    });
    return created.user.id;
  } catch (error) {
    // Dois eventos simultâneos da mesma compradora podem disputar a criação da conta.
    const concurrent = await db.query.user.findFirst({
      columns: { id: true },
      where: eq(user.email, email),
    });
    if (concurrent) return concurrent.id;
    throw error;
  }
}

/** Processa uma transação por vez; reprocessamento do mesmo ID não concede acesso novamente. */
export async function processHotmartEvent(event: HotmartPurchaseEvent): Promise<string> {
  const effect = purchaseEffect(event.event);
  const email = event.data.buyer.email.trim().toLowerCase();
  const productUcode = event.data.product.ucode;
  const transaction = event.data.purchase.transaction;
  const createdAt = new Date(event.creation_date);
  if (Number.isNaN(createdAt.getTime())) throw new Error('Data inválida no aviso da Hotmart.');
  const received = await db.query.hotmartEvents.findFirst({
    columns: { result: true },
    where: eq(hotmartEvents.id, event.id),
  });
  if (received && received.result !== 'Produto sem acesso configurado.')
    return 'Aviso já recebido.';
  const mapping = await db.query.hotmartProductMappings.findMany({
    where: eq(hotmartProductMappings.productUcode, productUcode),
  });

  let buyerId: string | null = null;
  if (effect === 'grant' && mapping.length) {
    buyerId = await findOrCreateBuyer(
      email,
      event.data.buyer.name?.trim() || email.split('@')[0] || 'Aluna',
    );
  }

  return db.transaction(async (tx) => {
    // Serializa eventos da mesma transação e, depois, a recomputação dos acessos da aluna.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${transaction}))`);
    const duplicate = await tx.query.hotmartEvents.findFirst({
      columns: { id: true, result: true },
      where: eq(hotmartEvents.id, event.id),
    });
    if (duplicate && duplicate.result !== 'Produto sem acesso configurado.')
      return 'Aviso já recebido.';
    let result = 'Aviso sem mudança de acesso.';
    if (!mapping.length) result = 'Produto sem acesso configurado.';
    else if (effect !== 'ignore') {
      const previous = await tx.query.hotmartPurchases.findFirst({
        where: eq(hotmartPurchases.transaction, transaction),
      });
      if (previous && (previous.productUcode !== productUcode || previous.buyerEmail !== email)) {
        throw new Error('A transação chegou com outra compradora ou produto.');
      }
      const active = effect === 'grant';
      if (shouldApplyEvent(previous, { createdAt, active })) {
        const linkedUserId =
          buyerId ??
          previous?.userId ??
          (await tx.query.user.findFirst({ columns: { id: true }, where: eq(user.email, email) }))
            ?.id ??
          null;
        await tx
          .insert(hotmartPurchases)
          .values({
            transaction,
            buyerEmail: email,
            productUcode,
            userId: linkedUserId,
            active,
            lastEventAt: createdAt,
          })
          .onConflictDoUpdate({
            target: hotmartPurchases.transaction,
            set: { userId: linkedUserId, active, lastEventAt: createdAt, updatedAt: new Date() },
          });
        if (linkedUserId) {
          await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${linkedUserId}))`);
          for (const { access } of mapping) {
            const mappedCodes = await tx.query.hotmartProductMappings.findMany({
              columns: { productUcode: true },
              where: eq(hotmartProductMappings.access, access),
            });
            const activePurchases = await tx.query.hotmartPurchases.findMany({
              columns: { transaction: true },
              where: and(
                eq(hotmartPurchases.userId, linkedUserId),
                eq(hotmartPurchases.active, true),
                inArray(
                  hotmartPurchases.productUcode,
                  mappedCodes.map((item) => item.productUcode),
                ),
              ),
            });
            const manual = await tx.query.manualProductGrants.findFirst({
              columns: { userId: true },
              where: and(
                eq(manualProductGrants.userId, linkedUserId),
                eq(manualProductGrants.product, access),
              ),
            });
            if (activePurchases.length || manual) {
              await tx
                .insert(studentProducts)
                .values({ userId: linkedUserId, product: access as ProductId })
                .onConflictDoNothing();
            } else {
              await tx
                .delete(studentProducts)
                .where(
                  and(
                    eq(studentProducts.userId, linkedUserId),
                    eq(studentProducts.product, access),
                  ),
                );
            }
          }
        }
        result = active
          ? 'Compra aprovada; acesso liberado.'
          : 'Reembolso recebido; acesso recalculado.';
      } else result = 'Aviso antigo; acesso mantido.';
    }
    await tx
      .insert(hotmartEvents)
      .values({
        id: event.id,
        event: event.event,
        transaction,
        buyerEmail: email,
        productUcode,
        result,
      })
      .onConflictDoUpdate({ target: hotmartEvents.id, set: { result, receivedAt: new Date() } });
    return result;
  });
}
