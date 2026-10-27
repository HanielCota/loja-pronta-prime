import { parseHotmartEvent, purchaseEffect } from './event';

export const HOTMART_RETRYABLE_RESULTS = [
  'Produto sem acesso configurado.',
  'Compra sem data original; acesso não liberado.',
  'ID e código do produto incompatíveis; acesso não alterado.',
  'Compra com reembolso pendente; acesso não liberado.',
] as const;

export const pendingRefundResult = HOTMART_RETRYABLE_RESULTS[3];

export function isRetryableHotmartResult(result: string) {
  return HOTMART_RETRYABLE_RESULTS.some((item) => item === result);
}

type ReplayRecord = {
  id: string;
  event: string;
  transaction: string;
  buyerEmail: string;
  productUcode: string;
  productId: number | null;
  productName: string | null;
  buyerName: string | null;
  eventVersion: string | null;
  eventCreatedAt: Date | null;
  orderedAt: Date | null;
};

/** Replays use original provider dates; older records require a real Hotmart redelivery. */
export function hotmartEventForReplay(record: ReplayRecord) {
  if (!record.eventCreatedAt || !record.eventVersion) return null;
  if (purchaseEffect(record.event) === 'grant' && !record.orderedAt) return null;
  const parsed = parseHotmartEvent({
    id: record.id,
    event: record.event,
    version: record.eventVersion,
    creation_date: record.eventCreatedAt.getTime(),
    data: {
      product: {
        ucode: record.productUcode,
        id: record.productId,
        name: record.productName,
      },
      buyer: { email: record.buyerEmail, name: record.buyerName },
      purchase: { transaction: record.transaction, order_date: record.orderedAt?.getTime() },
    },
  });
  return parsed.success ? parsed.data : null;
}
