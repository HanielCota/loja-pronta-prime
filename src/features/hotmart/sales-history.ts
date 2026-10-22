import { z } from 'zod';
import { cleanBuyerName } from './event';
import { purchaseExpiresAt } from '@/features/products/access-term';
export { purchaseExpiresAt as salesAccessExpiresAt } from '@/features/products/access-term';

const rowSchema = z.object({
  sourceRow: z.number().int().min(2),
  productName: z.string(),
  productId: z.string(),
  transaction: z.string(),
  soldAt: z.string(),
  confirmedAt: z.string(),
  status: z.string(),
  name: z.string(),
  email: z.string(),
});

const sourceProducts: Record<string, string> = {
  '3454404': 'MSL 2.0',
  '5398231': '| MSL 2.0',
  '5398081': 'MSL 2.0 + Bônus: Blindada de Mim Mesma',
};

/** The report has no time zone. The operator must explicitly supply its UTC offset. */
export function parseSalesDate(value: string, utcOffset: string): Date | null {
  if (!/^[+-](?:0\d|1[0-4]):[0-5]\d$/.test(utcOffset)) return null;
  if (utcOffset.slice(1, 3) === '14' && utcOffset.slice(4) !== '00') return null;
  const match = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, day, month, year, hour, minute, second] = match;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  const wall = new Date(`${iso}Z`);
  if (!Number.isFinite(wall.getTime()) || wall.toISOString().slice(0, 19) !== iso) return null;
  const result = new Date(`${iso}${utcOffset}`);
  return Number.isFinite(result.getTime()) ? result : null;
}

export function prepareSalesHistory(input: unknown, asOf: Date, utcOffset: string) {
  if (!Number.isFinite(asOf.getTime()) || !parseSalesDate('01/01/2025 00:00:00', utcOffset))
    throw new Error('A valid reference date and explicit report UTC offset are required.');
  const rows = z.array(rowSchema).min(1).parse(input);
  const occurrences = new Map<string, number>();
  for (const row of rows) {
    const transaction = row.transaction.trim();
    occurrences.set(transaction, (occurrences.get(transaction) ?? 0) + 1);
  }
  const purchases = [];
  const review: { sourceRow: number; reasons: string[] }[] = [];
  const statuses: Record<string, number> = {};
  const products: Record<string, number> = {};
  for (const row of rows) {
    statuses[row.status] = (statuses[row.status] ?? 0) + 1;
    products[row.productId] = (products[row.productId] ?? 0) + 1;
    const reasons: string[] = [];
    const email = row.email.trim().toLowerCase();
    const transaction = row.transaction.trim();
    const name = cleanBuyerName(row.name);
    const purchasedAt = parseSalesDate(row.soldAt, utcOffset);
    const confirmedAt = parseSalesDate(row.confirmedAt, utcOffset);
    if (sourceProducts[row.productId] !== row.productName) reasons.push('unrecognized-product');
    if (!['Completo', 'Aprovado'].includes(row.status)) reasons.push('unconfirmed-status');
    if (!z.email().max(254).safeParse(email).success) reasons.push('invalid-email');
    // Installment transactions retain suffixes such as C1; never strip or merge them.
    if (!/^HP[A-Za-z0-9]{1,198}$/.test(transaction)) reasons.push('invalid-transaction');
    if ((occurrences.get(transaction) ?? 0) > 1) reasons.push('duplicate-transaction');
    if (!name) reasons.push('missing-buyer-name');
    if (!purchasedAt || !confirmedAt) reasons.push('invalid-date');
    if (purchasedAt && confirmedAt && confirmedAt < purchasedAt)
      reasons.push('confirmation-before-purchase');
    if ((purchasedAt && purchasedAt > asOf) || (confirmedAt && confirmedAt > asOf))
      reasons.push('future-date');
    if (reasons.length || !purchasedAt || !confirmedAt) {
      review.push({ sourceRow: row.sourceRow, reasons });
      continue;
    }
    const expiresAt = purchaseExpiresAt(purchasedAt, utcOffset);
    purchases.push({
      sourceRow: row.sourceRow,
      transaction,
      email,
      name,
      sourceProductId: row.productId,
      product: 'sll' as const,
      purchasedAt: purchasedAt.toISOString(),
      confirmedAt: confirmedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      eligibility: expiresAt > asOf ? ('eligible' as const) : ('expired' as const),
    });
  }
  const eligible = purchases.filter((purchase) => purchase.eligibility === 'eligible');
  return {
    summary: {
      asOf: asOf.toISOString(),
      reportUtcOffset: utcOffset,
      sourceRows: rows.length,
      preparedPurchases: purchases.length,
      reviewRows: review.length,
      uniqueSourceEmails: new Set(rows.map((row) => row.email.trim().toLowerCase())).size,
      preparedEmails: new Set(purchases.map((purchase) => purchase.email)).size,
      eligiblePurchases: eligible.length,
      eligibleEmails: new Set(eligible.map((purchase) => purchase.email)).size,
      expiredPurchases: purchases.length - eligible.length,
      storeGrants: 0,
      statuses,
      products,
    },
    purchases,
    review,
  };
}
