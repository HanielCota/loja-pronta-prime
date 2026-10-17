import { SHOPEE_CONNECT_PATH } from '@/config/shopee';

export type ShopeeEntry = 'sll' | 'loja-pronta';

/** Só destinos internos conhecidos; o retorno nunca vem de um URL enviado pelo navegador. */
export function shopeeEntry(value: unknown): ShopeeEntry {
  return value === 'sll' ? 'sll' : 'loja-pronta';
}

export function shopeeConnectionPath(entry: ShopeeEntry) {
  return entry === 'sll' ? '/sll/minhas-lojas/conectar' : SHOPEE_CONNECT_PATH;
}
