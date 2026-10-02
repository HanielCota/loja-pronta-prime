import type { Metadata, Viewport } from 'next';
import { Inconsolata, Manrope } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

// Só pra blocos de código: sem preload, não pesa nas páginas que não usam.
const inconsolata = Inconsolata({
  subsets: ['latin'],
  variable: '--font-inconsolata',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: 'Loja Pronta Prime',
    template: '%s | Loja Pronta Prime',
  },
  description:
    'Área de membros da Loja Pronta Prime: aprenda a vender na Shopee ou acompanhe a montagem da sua loja.',
};

// Barra do navegador no celular na mesma cor do fundo.
export const viewport: Viewport = {
  themeColor: '#f5f5f7',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} ${inconsolata.variable}`}>
      <body>{children}</body>
    </html>
  );
}
