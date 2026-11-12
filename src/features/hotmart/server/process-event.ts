import { randomUUID } from 'node:crypto';
import { revalidateAdminOverview } from '@/features/admin/server/overview-cache';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { purchaseExpiresAt } from '@/features/products/access-term';
import {
  historicalSllPurchases,
  hotmartEvents,
  hotmartFirstAccessEmails,
  hotmartPurchases,
  user,
} from '@/server/db/schema';
import { reconcileProductAccess } from './product-access';
import { productIdentityConflict, resolveProductIdentity } from './product-identity';
import {
  HOTMART_RETRYABLE_RESULTS,
  isRetryableHotmartResult,
  pendingRefundResult,
} from '../recovery';
export { isRetryableHotmartResult } from '../recovery';
import {
  purchaseEffect,
  shouldApplyEvent,
  transactionMismatch,
  type HotmartPurchaseEvent,
} from '../event';

const missingDateResult = 'Compra sem data original; acesso não liberado.';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ProductIdentity = Awaited<ReturnType<typeof resolveProductIdentity>>;
type PreviousPurchase = typeof hotmartPurchases.$inferSelect | undefined;

async function findOrCreateBuyer(tx: Transaction, email: string, name: string) {
  // A conta sem credencial e o convite só existem se a compra for gravada com sucesso.
  const [created] = await tx
    .insert(user)
    .values({
      id: randomUUID(),
      email,
      name,
      role: 'user',
      emailVerified: true,
      mustChangePassword: false,
    })
    .onConflictDoNothing({ target: user.email })
    .returning({ id: user.id });
  if (created) {
    await tx.insert(hotmartFirstAccessEmails).values({ userId: created.id, email });
    return created.id;
  }

  const concurrent = await tx.query.user.findFirst({
    columns: { id: true },
    where: eq(user.email, email),
  });
  if (!concurrent) {
    throw new Error('The buyer account changed during purchase processing.');
  }

  return concurrent.id;
}

/** O que o aviso trouxe, já normalizado, para as funções que decidem o resultado. */
type EventContext = {
  event: HotmartPurchaseEvent;
  effect: ReturnType<typeof purchaseEffect>;
  email: string;
  productUcode: HotmartPurchaseEvent['data']['product']['ucode'];
  transaction: HotmartPurchaseEvent['data']['purchase']['transaction'];
  createdAt: Date;
  orderDate: Date | null;
};

// Compra histórica: o aviso só desativa no reembolso e recalcula o acesso; a validade é a original.
async function historicalEventResult(
  tx: Transaction,
  historical: typeof historicalSllPurchases.$inferSelect,
  conflict: ProductIdentity['conflict'],
  { event, effect, transaction }: EventContext,
): Promise<string> {
  if (conflict) return productIdentityConflict;
  if (event.data.product.id && String(event.data.product.id) !== historical.sourceProductId)
    return 'Transação histórica com outro produto; acesso mantido.';
  if (historical.userId) {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${historical.userId}))`);
    let result = 'Compra histórica preservada; validade original mantida.';
    if (effect === 'revoke') {
      await tx
        .update(historicalSllPurchases)
        .set({ active: false })
        .where(eq(historicalSllPurchases.transaction, transaction));
      result = 'Reembolso histórico recebido; acesso recalculado.';
    }
    await reconcileProductAccess(tx, historical.userId, 'sll');
    return result;
  }
  if (effect !== 'revoke') return 'Compra histórica preservada; validade original mantida.';
  await tx
    .update(historicalSllPurchases)
    .set({ active: false })
    .where(eq(historicalSllPurchases.transaction, transaction));
  return 'Reembolso histórico registrado.';
}

// Compra comum: confere produto e efeito antes de aplicar; devolve o texto guardado no histórico.
async function purchaseEventResult(
  tx: Transaction,
  mapping: ProductIdentity['mapping'],
  conflict: ProductIdentity['conflict'],
  context: EventContext,
): Promise<string> {
  if (conflict) return productIdentityConflict;
  if (!mapping.length) return 'Produto sem acesso configurado.';
  if (context.effect === 'ignore') return 'Aviso sem mudança de acesso.';
  // A retained refund must block approvals even across recovery batches or live redeliveries.
  if (context.effect === 'grant') {
    const refund = await tx.query.hotmartEvents.findFirst({
      columns: { id: true },
      where: and(
        eq(hotmartEvents.transaction, context.transaction),
        eq(hotmartEvents.productUcode, context.productUcode),
        ne(hotmartEvents.id, context.event.id),
        inArray(hotmartEvents.event, ['PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK']),
        inArray(hotmartEvents.result, [...HOTMART_RETRYABLE_RESULTS]),
      ),
    });
    if (refund) return pendingRefundResult;
  }
  const previous = await tx.query.hotmartPurchases.findFirst({
    where: eq(hotmartPurchases.transaction, context.transaction),
  });
  // Erro aqui faria a Hotmart reenviar para sempre e o reembolso nunca seria aplicado;
  // por isso a diferença fica registrada no histórico em vez de virar falha.
  const mismatch = transactionMismatch(previous, {
    buyerEmail: context.email,
    productUcode: context.productUcode,
    productId: context.event.data.product.id,
  });
  if (mismatch === 'product') return 'Transação já registrada com outro produto; acesso mantido.';
  const result = await applyPurchaseEvent(tx, mapping, previous, mismatch, context);
  if (mismatch === 'email')
    return result + ' O email mudou na Hotmart; a compra segue na mesma conta.';
  return result;
}

// Liga a compra à conta da aluna e grava o aviso quando ele é mais novo que o já aplicado.
async function applyPurchaseEvent(
  tx: Transaction,
  mapping: ProductIdentity['mapping'],
  initialPrevious: PreviousPurchase,
  mismatch: ReturnType<typeof transactionMismatch>,
  { event, effect, email, productUcode, transaction, createdAt, orderDate }: EventContext,
): Promise<string> {
  let previous = initialPrevious;
  const active = effect === 'grant';
  // Purchase ownership survives email changes in either the platform or Hotmart.
  let linkedUserId = previous?.userId ?? null;
  if (!linkedUserId && mismatch !== 'email') {
    const existing = await tx.query.user.findFirst({
      columns: { id: true },
      where: eq(user.email, email),
    });
    linkedUserId = existing?.id ?? null;
  }

  if (linkedUserId) {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${linkedUserId}))`);
    // A admin pode ter revogado esta compra enquanto o aviso aguardava a trava.
    // Releia antes de aplicar o evento e antes de travar a linha da compra.
    previous = await tx.query.hotmartPurchases.findFirst({
      where: eq(hotmartPurchases.transaction, transaction),
    });
  }

  const applies =
    shouldApplyEvent(previous, { createdAt, active }) ||
    (active &&
      previous?.active &&
      !previous.purchasedAt &&
      orderDate &&
      createdAt >= previous.lastEventAt);
  if (!applies) return 'Aviso antigo; acesso mantido.';
  // Later completion/replay events can shorten a corrected term but never renew it.
  const purchasedAt =
    previous?.purchasedAt && (!orderDate || previous.purchasedAt <= orderDate)
      ? previous.purchasedAt
      : orderDate;
  const expiresAt = purchasedAt ? purchaseExpiresAt(purchasedAt) : null;
  const now = new Date();
  const accessGranted = Boolean(
    active && purchasedAt && expiresAt && purchasedAt <= now && expiresAt > now,
  );
  if (!linkedUserId && accessGranted && orderDate && orderDate <= now) {
    linkedUserId = await findOrCreateBuyer(
      tx,
      email,
      event.data.buyer.name?.trim() || email.split('@')[0] || 'Aluna',
    );
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${linkedUserId}))`);
  }

  await tx
    .insert(hotmartPurchases)
    .values({
      transaction,
      buyerEmail: email,
      productUcode,
      productId: event.data.product.id,
      expert: mapping.find((item) => item.access === 'sll')?.expert ?? mapping[0]?.expert ?? 'pri',
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
  return active
    ? accessGranted
      ? 'Compra aprovada; acesso liberado.'
      : !purchasedAt
        ? missingDateResult
        : 'Compra fora do prazo válido; acesso não liberado.'
    : 'Reembolso recebido; acesso recalculado.';
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
  if (received && !isRetryableHotmartResult(received.result)) return 'Aviso já recebido.';
  const context: EventContext = {
    event,
    effect,
    email,
    productUcode,
    transaction,
    createdAt,
    orderDate,
  };
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
    if (duplicate && !isRetryableHotmartResult(duplicate.result)) return 'Aviso já recebido.';
    const replayFields = {
      productName: event.data.product.name ?? null,
      buyerName: event.data.buyer.name ?? null,
      eventVersion: event.version,
      eventCreatedAt: createdAt,
      orderedAt: orderDate,
    };
    const historical = await tx.query.historicalSllPurchases.findFirst({
      where: eq(historicalSllPurchases.transaction, transaction),
    });
    if (historical) {
      const result = await historicalEventResult(tx, historical, conflict, context);
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
          ...replayFields,
        })
        .onConflictDoUpdate({
          target: hotmartEvents.id,
          set: {
            result,
            productId: event.data.product.id,
            receivedAt: new Date(),
            ...replayFields,
          },
        });
      return result;
    }
    const result = await purchaseEventResult(tx, mapping, conflict, context);
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
        ...replayFields,
      })
      .onConflictDoUpdate({
        target: hotmartEvents.id,
        set: { result, productId: event.data.product.id, receivedAt: new Date(), ...replayFields },
      });
    return result;
  });
  revalidateAdminOverview();
  return processed;
}
