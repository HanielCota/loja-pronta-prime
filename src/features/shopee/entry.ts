import { SHOPEE_CONNECT_PATH } from '@/config/shopee';

export type ShopeeEntry = 'sll' | 'loja-pronta' | 'recovered';

/** Só destinos internos conhecidos; o retorno nunca vem de um URL enviado pelo navegador. */
export function shopeeEntry(value: unknown): ShopeeEntry {
  return value === 'recovered' ? 'recovered' : value === 'sll' ? 'sll' : 'loja-pronta';
}

export function shopeeConnectionPath(entry: ShopeeEntry) {
  return entry === 'recovered'
    ? '/loja-pronta/produtos/recovered/connect'
    : entry === 'sll'
      ? '/sll/minhas-lojas/conectar'
      : SHOPEE_CONNECT_PATH;
}

export function shopeeEntryProduct(entry: ShopeeEntry) {
  return entry === 'sll' ? 'sll' : 'loja-pronta';
}
