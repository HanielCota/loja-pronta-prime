import { z } from 'zod';
import { hasControlCharacters } from '@/lib/text';

const identifier = z
  .string()
  .min(1)
  .max(200)
  .refine((value) => !hasControlCharacters(value));

/**
 * Campo opcional que a Hotmart pode mandar como `null` em vez de omitir. Recusar o aviso inteiro
 * por isso faria a Hotmart reenviar pra sempre e um reembolso nunca seria aplicado. Então `null`
 * vira ausente, e o processamento já sabe agir sem o campo.
 */
const absentWhenNull = <Schema extends z.ZodType>(schema: Schema) =>
  schema
    .nullish()
    .transform((value) => value ?? undefined)
    .optional();

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
    product: z.object({
      ucode: identifier,
      id: absentWhenNull(z.number().int().positive().safe()),
    }),
    buyer: z.object({
      // Espaço colado no checkout não pode recusar a compra: corta antes de validar.
      email: z.string().trim().pipe(z.email().max(254)),
      // O nome vem do que a compradora digitou no checkout: uma quebra de linha colada ali não
      // pode recusar o aviso (a Hotmart reenviaria pra sempre e ela ficaria sem acesso). Então
      // ele é limpo, não recusado: controles viram espaço e o excesso é cortado. O teto bruto
      // continua barrando corpo gigante.
      name: absentWhenNull(z.string().max(2000).transform(cleanBuyerName)),
    }),
    purchase: z.object({
      transaction: identifier,
      // Sem data, a compra não libera acesso (fica registrada para nova tentativa), mas um
      // reembolso continua valendo. Texto vazio segue recusado: Number('') daria 0.
      order_date: absentWhenNull(
        z
          .union([
            z.number(),
            z
              .string()
              .regex(/^\d{1,15}$/)
              .transform(Number),
          ])
          .pipe(z.number().int().positive().max(253_402_300_799_999)),
      ),
    }),
  }),
});

/** Tira caracteres de controle, junta espaços repetidos e corta em 200 caracteres. */
export function cleanBuyerName(value: string): string {
  const spaced = Array.from(value, (char) => (hasControlCharacters(char) ? ' ' : char)).join('');
  return spaced.replace(/\s+/g, ' ').trim().slice(0, 200).trim();
}

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
  current:
    { buyerEmail: string; productUcode: string; productId?: number | null | undefined } | undefined,
  next: { buyerEmail: string; productUcode: string; productId?: number | null | undefined },
): 'product' | 'email' | null {
  if (!current) return null;
  if (current.productUcode !== next.productUcode) return 'product';
  if (current.productId && next.productId && current.productId !== next.productId) return 'product';
  if (current.buyerEmail !== next.buyerEmail) return 'email';
  return null;
}
