/**
 * Produtos vendidos pela Hotmart que liberam uma área na plataforma (docs/PRODUTO.md).
 * Lista única: usada pelo banco (o que cada aluna tem), pelo servidor e pelas telas.
 */
export const PRODUCT_IDS = ['sll', 'loja-pronta'] as const;

export type ProductId = (typeof PRODUCT_IDS)[number];
