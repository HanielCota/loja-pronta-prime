import { z } from 'zod';
import { hasControlCharacters } from '@/lib/text';

const identifier = z
  .string()
  .min(1)
  .max(200)
  .refine((value) => !hasControlCharacters(value));

const purchaseEvent = z.object({
  id: identifier,
  event: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Z_]+$/),
  creation_date: z.number().int().positive().max(253_402_300_799_999),
  version: z.string().startsWith('2.').max(20),
  data: z.object({
    product: z.object({ ucode: identifier }),
    buyer: z.object({
      email: z.email().max(254),
      name: z
        .string()
        .trim()
        .max(200)
        .refine((value) => !hasControlCharacters(value))
        .optional(),
    }),
    purchase: z.object({ transaction: identifier }),
  }),
});

export type HotmartPurchaseEvent = z.infer<typeof purchaseEvent>;

/** Eventos que alteram a compra. Outros avisos são aceitos sem liberar acesso. */
export function purchaseEffect(event: string): 'grant' | 'revoke' | 'ignore' {
  if (event === 'PURCHASE_APPROVED' || event === 'PURCHASE_COMPLETE') return 'grant';
  if (event === 'PURCHASE_REFUNDED' || event === 'PURCHASE_CHARGEBACK') return 'revoke';
  return 'ignore';
}

export function parseHotmartEvent(value: unknown) {
  return purchaseEvent.safeParse(value);
}

/** Um reembolso não pode ser revertido por um aviso antigo que chegou atrasado. */
export function shouldApplyEvent(
  current: { lastEventAt: Date; active: boolean } | undefined,
  next: { createdAt: Date; active: boolean },
) {
  if (!current) return true;
  // Reembolso e chargeback encerram esta transação; outra compra tem outro número.
  if (!current.active && next.active) return false;
  const difference = next.createdAt.getTime() - current.lastEventAt.getTime();
  return difference > 0 || (difference === 0 && current.active && !next.active);
}

/**
 * Compara um aviso com a compra já registrada na mesma transação. A compradora pode trocar o
 * email na Hotmart, então email diferente não impede o reembolso: a compra continua ligada à
 * conta de antes. Produto diferente é estranho demais para mexer em acesso.
 */
export function transactionMismatch(
  current: { buyerEmail: string; productUcode: string } | undefined,
  next: { buyerEmail: string; productUcode: string },
): 'product' | 'email' | null {
  if (!current) return null;
  if (current.productUcode !== next.productUcode) return 'product';
  if (current.buyerEmail !== next.buyerEmail) return 'email';
  return null;
}
