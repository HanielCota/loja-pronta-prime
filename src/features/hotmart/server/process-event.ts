import { revalidateAdminOverview } from '@/features/admin/server/overview-cache';
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
import {
  purchaseEffect,
  shouldApplyEvent,
  transactionMismatch,
  type HotmartPurchaseEvent,
} from '../event';

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

  // Leitura prévia, fora do bloqueio, só para não criar conta à toa; a decisão é refeita abaixo.
  const known = await db.query.hotmartPurchases.findFirst({
    columns: { buyerEmail: true, productUcode: true, userId: true },
    where: eq(hotmartPurchases.transaction, transaction),
  });
  const knownMismatch = transactionMismatch(known, { buyerEmail: email, productUcode });
  const keepsKnownAccount =
    knownMismatch === 'product' || (knownMismatch === 'email' && Boolean(known?.userId));

  let buyerId: string | null = null;
  if (effect === 'grant' && mapping.length && !keepsKnownAccount) {
    buyerId = await findOrCreateBuyer(
      email,
      event.data.buyer.name?.trim() || email.split('@')[0] || 'Aluna',
    );
  }

  const processed = await db.transaction(async (tx) => {
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
      // Erro aqui faria a Hotmart reenviar para sempre e o reembolso nunca seria aplicado;
      // por isso a diferença fica registrada no histórico em vez de virar falha.
      const mismatch = transactionMismatch(previous, { buyerEmail: email, productUcode });
      const active = effect === 'grant';
      if (mismatch === 'product') {
        result = 'Transação já registrada com outro produto; acesso mantido.';
      } else if (shouldApplyEvent(previous, { createdAt, active })) {
        // Com email trocado, a compra segue na conta que ela já usa, sem procurar pelo novo.
        const linkedUserId =
          mismatch === 'email'
            ? (previous?.userId ?? buyerId)
            : (buyerId ??
              previous?.userId ??
              (
                await tx.query.user.findFirst({
                  columns: { id: true },
                  where: eq(user.email, email),
                })
              )?.id ??
              null);
        await tx
          .insert(hotmartPurchases)
          .values({
            transaction,
            buyerEmail: email,
            productUcode,
            expert:
              mapping.find((item) => item.access === 'sll')?.expert ?? mapping[0]?.expert ?? 'pri',
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
      if (mismatch === 'email')
        result += ' O email mudou na Hotmart; a compra segue na mesma conta.';
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
  revalidateAdminOverview();
  return processed;
}
