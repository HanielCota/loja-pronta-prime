import { z } from 'zod';

/**
 * Uma página de `get_item_list`. Quando a loja não tem anúncios naquele status, a Shopee omite o
 * campo `item` em vez de mandar lista vazia: sem o padrão, loja nova (ou sem banidos) falharia
 * em toda publicação e coleta. Ausente aqui quer dizer "nenhum anúncio".
 */
export const shopeeItemListPageSchema = z.object({
  item: z.array(z.object({ item_id: z.number().int().positive().safe() })).default([]),
  has_next_page: z.boolean(),
  next_offset: z.number().int().nonnegative().optional(),
});
