import type { Metadata } from 'next';
import { ProductLobby } from '@/features/products/server/product-lobby';

export const metadata: Metadata = {
  title: 'Suas áreas',
};

/** Menu explícito da navbar; não redireciona quem tem só um produto. */
export default function MenuPage() {
  return <ProductLobby />;
}
