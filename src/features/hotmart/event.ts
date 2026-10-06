import { z } from 'zod';

const purchaseEvent = z.object({
  id: z.string().min(1),
  event: z.string().min(1),
  creation_date: z.number().int().positive(),
  version: z.string().startsWith('2.'),
  data: z.object({
    product: z.object({ ucode: z.string().min(1) }),
    buyer: z.object({ email: z.email(), name: z.string().optional() }),
    purchase: z.object({ transaction: z.string().min(1) }),
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
