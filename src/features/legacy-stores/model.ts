import { z } from 'zod';

// Keep the original field names and values so every imported record remains traceable.
const customer = z
  .object({
    id: z.guid(),
    nome: z.string().nullable(),
    email: z.string(),
    telefone: z.string().nullable(),
  })
  .passthrough();
const store = z
  .object({
    id: z.guid(),
    cliente_id: z.guid(),
    nome: z.string().nullable(),
    descricao: z.string().nullable(),
    shopee_shop_id: z.string().nullable(),
    shopee_nome: z.string().nullable(),
    loja_shopee_vinculada_id: z.guid().nullable(),
    situacao_entrega: z.string().nullable(),
    pendencias: z.array(z.string()).nullable(),
  })
  .passthrough();
const product = z
  .object({
    id: z.guid(),
    loja_id: z.guid(),
    titulo: z.string().nullable(),
    descricao: z.string().nullable(),
    preco_final: z.number().finite(),
    shopee_item_id: z.string().nullable(),
    situacao_publicacao: z.string().nullable(),
    situacao_anuncio_shopee: z.string().nullable(),
  })
  .passthrough();
const purchase = z
  .object({
    transacao_id: z.string().min(1),
    cliente_id: z.guid().nullable(),
    loja_id: z.guid().nullable(),
  })
  .passthrough();

export type LegacyCustomer = z.infer<typeof customer>;
export type LegacyStore = z.infer<typeof store>;
export type LegacyProduct = z.infer<typeof product>;
export type LegacyPurchase = z.infer<typeof purchase>;

export const legacySnapshotSchema = z.object({
  customers: z.array(customer),
  stores: z.array(store),
  products: z.array(product),
  purchases: z.array(purchase),
});
export type LegacySnapshot = z.infer<typeof legacySnapshotSchema>;

export function normalizeLegacyEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateLegacySnapshot(input: unknown): LegacySnapshot {
  const snapshot = legacySnapshotSchema.parse(input);
  const customers = new Map(snapshot.customers.map((row) => [row.id, row]));
  const stores = new Map(snapshot.stores.map((row) => [row.id, row]));
  const emails = new Set<string>();
  for (const [rows, key] of [
    [snapshot.customers, 'id'],
    [snapshot.stores, 'id'],
    [snapshot.products, 'id'],
    [snapshot.purchases, 'transacao_id'],
  ] as const) {
    const ids = rows.map((row) => row[key as keyof typeof row]);
    if (new Set(ids).size !== ids.length) throw new Error('Duplicate legacy record identifier.');
  }
  for (const row of snapshot.customers) {
    const email = normalizeLegacyEmail(row.email);
    if (!z.email().safeParse(email).success || emails.has(email))
      throw new Error('Invalid or duplicate legacy email.');
    emails.add(email);
    if (
      !snapshot.stores.some((s) => s.cliente_id === row.id) &&
      !snapshot.purchases.some((p) => p.cliente_id === row.id)
    )
      throw new Error('Legacy customer has no store or purchase reference.');
  }
  for (const row of snapshot.stores) {
    if (!customers.has(row.cliente_id)) throw new Error('Legacy store owner is missing.');
    if (
      row.loja_shopee_vinculada_id &&
      stores.get(row.loja_shopee_vinculada_id)?.cliente_id !== row.cliente_id
    )
      throw new Error('Linked legacy store has a different or missing owner.');
  }
  for (const row of snapshot.products) {
    if (!stores.has(row.loja_id)) throw new Error('Legacy product store is missing.');
  }
  for (const row of snapshot.purchases) {
    if (row.cliente_id && !customers.has(row.cliente_id))
      throw new Error('Legacy purchase customer is missing.');
    if (
      row.loja_id &&
      (!stores.has(row.loja_id) ||
        (row.cliente_id && stores.get(row.loja_id)?.cliente_id !== row.cliente_id))
    )
      throw new Error('Legacy purchase store owner does not match.');
  }
  return snapshot;
}

export function legacyDeliveryLabel(status: string | null): string {
  return (
    (
      {
        entrega_registrada: 'Delivery recorded',
        entrega_parcial_registrada: 'Partial delivery recorded',
        sem_entrega_registrada: 'No delivery recorded',
      } as Record<string, string>
    )[status ?? ''] ?? 'Delivery status unavailable'
  );
}

export function legacyShopUrl(shopId: string | null): string | null {
  return shopId && /^\d{1,20}$/.test(shopId) ? `https://shopee.com.br/shop/${shopId}` : null;
}

export function legacyPublicationLabel(status: string | null): string {
  return (
    (
      {
        publicado: 'Published',
        nao_publicado: 'Not published',
        requer_conferencia: 'Needs review',
        publicacao_em_andamento: 'Publication in progress',
      } as Record<string, string>
    )[status ?? ''] ?? 'Unavailable'
  );
}

export function legacyListingLabel(status: string | null): string {
  return (
    (
      {
        NORMAL: 'Active',
        REVIEWING: 'Under review',
        SELLER_DELETE: 'Deleted by seller',
        UNLIST: 'Unlisted',
        SHOPEE_DELETE: 'Deleted by Shopee',
        BANNED: 'Blocked',
      } as Record<string, string>
    )[status ?? ''] ?? 'Unavailable'
  );
}

export function legacyPendingLabel(code: string): string {
  return (
    (
      {
        confirmacao_de_entrega_nao_identificada: 'Delivery confirmation was not identified.',
        produtos_nao_identificados: 'No products were identified in the saved records.',
        vinculo_shopee_nao_identificado: 'A Shopee store link was not identified.',
        produtos_sem_publicacao: 'Some products have no recorded publication.',
        publicacao_requer_conferencia: 'Product publication needs review.',
        vinculo_shopee_requer_conferencia: 'The Shopee store link needs review.',
        vinculo_transacao_requer_conferencia: 'The purchase reference link needs review.',
      } as Record<string, string>
    )[code] ?? 'A saved pending item needs review.'
  );
}

export function legacyProductUrl(shopId: string | null, itemId: string | null): string | null {
  return legacyShopUrl(shopId) && itemId && /^\d{1,20}$/.test(itemId)
    ? `https://shopee.com.br/product/${shopId}/${itemId}`
    : null;
}
