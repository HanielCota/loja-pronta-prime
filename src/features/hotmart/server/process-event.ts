import { revalidateAdminOverview } from '@/features/admin/server/overview-cache';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { auth } from '@/server/auth/auth';
import { DEFAULT_STUDENT_PASSWORD } from '@/server/auth/student-password';
import { purchaseExpiresAt } from '@/features/products/access-term';
import { historicalSllPurchases } from '@/server/db/schema';
import { hotmartEvents, hotmartProductMappings, hotmartPurchases, user } from '@/server/db/schema';
import { reconcileProductAccess } from './product-access';
import { productIdentityConflict, resolveProductIdentity } from './product-identity';
import {
  purchaseEffect,
  shouldApplyEvent,
  transactionMismatch,
  type HotmartPurchaseEvent,
} from '../event';

const missingDateResult = 'Compra sem data original; acesso não liberado.';
const retryableResult = (result: string) =>
  result === 'Produto sem acesso configurado.' ||
  result === missingDateResult ||
  result === productIdentityConflict;

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
        password: DEFAULT_STUDENT_PASSWORD,
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
  const orderDate = event.data.purchase.order_date
    ? new Date(event.data.purchase.order_date)
    : null;
  if (Number.isNaN(createdAt.getTime())) throw new Error('Data inválida no aviso da Hotmart.');
  const received = await db.query.hotmartEvents.findFirst({
    columns: { result: true },
    where: eq(hotmartEvents.id, event.id),
  });
  if (received && !retryableResult(received.result)) return 'Aviso já recebido.';
  // Resolve numeric identities before account creation without holding a pooled
  // transaction connection while better-auth acquires its own connection.
  const preliminaryMapping =
    event.data.product.id === undefined
      ? await db.query.hotmartProductMappings.findMany({
          where: eq(hotmartProductMappings.productUcode, productUcode),
        })
      : await db.transaction(async (tx) => {
          await tx.execute(
            sql`select pg_advisory_xact_lock_shared(hashtext('hotmart-product-mappings'))`,
          );
          return (await resolveProductIdentity(tx, event.data.product)).mapping;
        });

  // Revalidate the mapping inside the purchase transaction before granting access.
  const known = await db.query.hotmartPurchases.findFirst({
    columns: { buyerEmail: true, productUcode: true, productId: true, userId: true },
    where: eq(hotmartPurchases.transaction, transaction),
  });
  const knownMismatch = transactionMismatch(known, {
    buyerEmail: email,
    productUcode,
    productId: event.data.product.id,
  });
  const knownHistorical = await db.query.historicalSllPurchases.findFirst({
    columns: { transaction: true },
    where: eq(historicalSllPurchases.transaction, transaction),
  });
  const keepsKnownAccount =
    knownMismatch === 'product' || (knownMismatch === 'email' && Boolean(known?.userId));

  let buyerId: string | null = null;
  if (
    effect === 'grant' &&
    !knownHistorical &&
    orderDate &&
    orderDate <= new Date() &&
    purchaseExpiresAt(orderDate) > new Date() &&
    preliminaryMapping.length &&
    !keepsKnownAccount
  ) {
    buyerId = await findOrCreateBuyer(
      email,
      event.data.buyer.name?.trim() || email.split('@')[0] || 'Aluna',
    );
  }

  const processed = await db.transaction(async (tx) => {
    // Uma mudança de códigos espera os avisos em andamento antes de decidir se já há compras.
    await tx.execute(
      sql`select pg_advisory_xact_lock_shared(hashtext('hotmart-product-mappings'))`,
    );
    const { mapping, conflict } = await resolveProductIdentity(tx, event.data.product);
    // Serializa eventos da mesma transação e, depois, a recomputação dos acessos da aluna.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${transaction}))`);
    const duplicate = await tx.query.hotmartEvents.findFirst({
      columns: { id: true, result: true },
      where: eq(hotmartEvents.id, event.id),
    });
    if (duplicate && !retryableResult(duplicate.result)) return 'Aviso já recebido.';
    const historical = await tx.query.historicalSllPurchases.findFirst({
      where: eq(historicalSllPurchases.transaction, transaction),
    });
    if (historical) {
      let result = 'Compra histórica preservada; validade original mantida.';
      if (conflict) {
        result = productIdentityConflict;
      } else if (
        event.data.product.id &&
        String(event.data.product.id) !== historical.sourceProductId
      ) {
        result = 'Transação histórica com outro produto; acesso mantido.';
      } else if (historical.userId) {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${historical.userId}))`);
        if (effect === 'revoke') {
          await tx
            .update(historicalSllPurchases)
            .set({ active: false })
            .where(eq(historicalSllPurchases.transaction, transaction));
          result = 'Reembolso histórico recebido; acesso recalculado.';
        }
        await reconcileProductAccess(tx, historical.userId, 'sll');
      } else if (effect === 'revoke') {
        await tx
          .update(historicalSllPurchases)
          .set({ active: false })
          .where(eq(historicalSllPurchases.transaction, transaction));
        result = 'Reembolso histórico registrado.';
      }
      await tx
        .insert(hotmartEvents)
        .values({
          id: event.id,
          event: event.event,
          transaction,
          buyerEmail: email,
          productUcode,
          productId: event.data.product.id,
          result,
        })
        .onConflictDoUpdate({
          target: hotmartEvents.id,
          set: { result, productId: event.data.product.id, receivedAt: new Date() },
        });
      return result;
    }
    let result = 'Aviso sem mudança de acesso.';
    if (conflict) result = productIdentityConflict;
    else if (!mapping.length) result = 'Produto sem acesso configurado.';
    else if (effect !== 'ignore') {
      let previous = await tx.query.hotmartPurchases.findFirst({
        where: eq(hotmartPurchases.transaction, transaction),
      });
      // Erro aqui faria a Hotmart reenviar para sempre e o reembolso nunca seria aplicado;
      // por isso a diferença fica registrada no histórico em vez de virar falha.
      const mismatch = transactionMismatch(previous, {
        buyerEmail: email,
        productUcode,
        productId: event.data.product.id,
      });
      const active = effect === 'grant';
      if (mismatch === 'product') {
        result = 'Transação já registrada com outro produto; acesso mantido.';
      } else {
        // Com email trocado, a compra segue na conta que ela já usa, sem procurar pelo novo.
        let linkedUserId =
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
        // Validate the product under the mapping lock before creating an account.
        if (
          !linkedUserId &&
          active &&
          orderDate &&
          orderDate <= new Date() &&
          purchaseExpiresAt(orderDate) > new Date()
        ) {
          linkedUserId = await findOrCreateBuyer(
            email,
            event.data.buyer.name?.trim() || email.split('@')[0] || 'Aluna',
          );
        }
        if (linkedUserId) {
          await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${linkedUserId}))`);
          // A admin pode ter revogado esta compra enquanto o aviso aguardava a trava.
          // Releia antes de aplicar o evento e antes de travar a linha da compra.
          previous = await tx.query.hotmartPurchases.findFirst({
            where: eq(hotmartPurchases.transaction, transaction),
          });
        }
        if (
          shouldApplyEvent(previous, { createdAt, active }) ||
          (active &&
            previous?.active &&
            !previous.purchasedAt &&
            orderDate &&
            createdAt >= previous.lastEventAt)
        ) {
          // Later completion/replay events can shorten a corrected term but never renew it.
          const purchasedAt =
            previous?.purchasedAt && (!orderDate || previous.purchasedAt <= orderDate)
              ? previous.purchasedAt
              : orderDate;
          const expiresAt = purchasedAt ? purchaseExpiresAt(purchasedAt) : null;
          await tx
            .insert(hotmartPurchases)
            .values({
              transaction,
              buyerEmail: email,
              productUcode,
              productId: event.data.product.id,
              expert:
                mapping.find((item) => item.access === 'sll')?.expert ??
                mapping[0]?.expert ??
                'pri',
              userId: linkedUserId,
              active,
              purchasedAt,
              expiresAt,
              lastEventAt: createdAt,
            })
            .onConflictDoUpdate({
              target: hotmartPurchases.transaction,
              set: {
                productId: event.data.product.id,
                userId: linkedUserId,
                active,
                purchasedAt,
                expiresAt,
                lastEventAt: createdAt,
                updatedAt: new Date(),
              },
            });
          if (linkedUserId) {
            for (const { access } of mapping) {
              await reconcileProductAccess(tx, linkedUserId, access);
            }
          }
          result = active
            ? expiresAt && purchasedAt && purchasedAt <= new Date() && expiresAt > new Date()
              ? 'Compra aprovada; acesso liberado.'
              : !purchasedAt
                ? missingDateResult
                : 'Compra fora do prazo válido; acesso não liberado.'
            : 'Reembolso recebido; acesso recalculado.';
        } else result = 'Aviso antigo; acesso mantido.';
      }
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
        productId: event.data.product.id,
        result,
      })
      .onConflictDoUpdate({
        target: hotmartEvents.id,
        set: { result, productId: event.data.product.id, receivedAt: new Date() },
      });
    return result;
  });
  revalidateAdminOverview();
  return processed;
}
