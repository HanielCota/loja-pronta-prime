import type { Metadata } from 'next';
import { ProductLobby } from '@/features/products/server/product-lobby';

export const metadata: Metadata = {
  title: 'Início',
};

/** Entrada após o login: quem tem só um produto vai direto pra ele. */
export default function HomePage() {
  return <ProductLobby enterSingleProduct />;
}
