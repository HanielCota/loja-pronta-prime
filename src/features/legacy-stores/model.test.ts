import { describe, expect, test } from 'bun:test';
import {
  legacyDeliveryLabel,
  legacyListingLabel,
  legacyPublicationLabel,
  legacyPendingLabel,
  legacyProductUrl,
  legacyShopUrl,
  normalizeLegacyEmail,
  validateLegacySnapshot,
} from './model';

const customerId = '00000001-0000-0000-0000-000000000001';
const storeId = '00000002-0000-0000-0000-000000000001';
function fixture() {
  return {
    customers: [
      {
        id: customerId,
        nome: null as string | null,
        email: ' Student@Example.com ',
        telefone: null,
      },
    ],
    stores: [
      {
        id: storeId,
        cliente_id: customerId,
        nome: 'Original Store',
        descricao: null,
        shopee_shop_id: '123',
        shopee_nome: null,
        loja_shopee_vinculada_id: null as string | null,
        situacao_entrega: 'sem_entrega_registrada',
        pendencias: ['Original pending item'],
      },
    ],
    products: [
      {
        id: '00000003-0000-0000-0000-000000000001',
        loja_id: storeId,
        titulo: 'Original item',
        descricao: 'Original description',
        preco_final: 12.34,
        shopee_item_id: '456',
        situacao_publicacao: 'publicado',
        situacao_anuncio_shopee: 'NORMAL',
      },
    ],
    purchases: [{ transacao_id: 'HP-ORIGINAL', cliente_id: customerId, loja_id: storeId }],
  };
}

describe('legacy records', () => {
  test('preserves original records and accepts PostgreSQL UUIDs without RFC version bits', () => {
    const data = fixture();
    expect(validateLegacySnapshot(data)).toEqual(data);
    expect(normalizeLegacyEmail(data.customers[0]!.email)).toBe('student@example.com');
  });
  test('refuses duplicate normalized identities and duplicate record IDs', () => {
    const data = fixture();
    data.customers.push({
      ...data.customers[0]!,
      id: '00000004-0000-0000-0000-000000000001',
      email: 'student@example.com',
    });
    expect(() => validateLegacySnapshot(data)).toThrow('duplicate legacy email');
    const duplicated = fixture();
    duplicated.products.push({ ...duplicated.products[0]! });
    expect(() => validateLegacySnapshot(duplicated)).toThrow('Duplicate legacy record');
  });
  test('refuses orphan products, stores and purchase references', () => {
    const data = fixture();
    data.products[0]!.loja_id = '00000009-0000-0000-0000-000000000001';
    expect(() => validateLegacySnapshot(data)).toThrow('product store is missing');
    const missing = fixture();
    missing.stores[0]!.cliente_id = data.products[0]!.loja_id;
    expect(() => validateLegacySnapshot(missing)).toThrow();
    const purchase = fixture();
    purchase.purchases[0]!.cliente_id = data.products[0]!.loja_id;
    expect(() => validateLegacySnapshot(purchase)).toThrow('purchase customer is missing');
  });
  test('refuses linked stores and purchase ownership crossing accounts', () => {
    const data = fixture();
    const otherId = '00000005-0000-0000-0000-000000000001';
    const otherStore = '00000006-0000-0000-0000-000000000001';
    data.customers.push({ id: otherId, nome: 'Other', email: 'other@example.com', telefone: null });
    data.stores.push({ ...data.stores[0]!, id: otherStore, cliente_id: otherId });
    data.stores[0]!.loja_shopee_vinculada_id = otherStore;
    expect(() => validateLegacySnapshot(data)).toThrow('different or missing owner');
    data.stores[0]!.loja_shopee_vinculada_id = null;
    data.purchases[0]!.loja_id = otherStore;
    expect(() => validateLegacySnapshot(data)).toThrow('purchase store owner does not match');
  });
  test('does not grant membership to a contact with no store or purchase evidence', () => {
    const data = fixture();
    data.stores = [];
    data.products = [];
    data.purchases = [];
    expect(() => validateLegacySnapshot(data)).toThrow('no store or purchase reference');
  });
  test('links only numeric Shopee identifiers and labels historical delivery explicitly', () => {
    expect(legacyShopUrl('123')).toBe('https://shopee.com.br/shop/123');
    expect(legacyProductUrl('123', '456')).toBe('https://shopee.com.br/product/123/456');
    expect(legacyShopUrl('https://attacker.example')).toBeNull();
    expect(legacyProductUrl('123', '../settings')).toBeNull();
    expect(legacyProductUrl(null, '456')).toBeNull();
    expect(legacyDeliveryLabel('entrega_registrada')).toBe('Entrega registrada');
    expect(legacyDeliveryLabel('unknown')).toBe('Situação da entrega não informada');
    expect(legacyPublicationLabel('publicado')).toBe('Publicado');
    expect(legacyPublicationLabel(null)).toBe('Não informado');
    expect(legacyListingLabel('NORMAL')).toBe('Ativo');
    expect(legacyListingLabel('future')).toBe('Não informado');
    expect(legacyPendingLabel('produtos_sem_publicacao')).toBe(
      'Alguns produtos estão sem publicação registrada.',
    );
    expect(legacyPendingLabel('unknown')).toBe('Uma pendência salva precisa de conferência.');
  });
});
