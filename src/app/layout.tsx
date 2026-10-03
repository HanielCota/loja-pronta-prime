import type { Metadata } from 'next';
import { Inconsolata, Manrope } from 'next/font/google';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { THEME_COLORS, THEME_INIT_SCRIPT } from '@/features/theme/theme';
import { ThemeSync } from '@/features/theme/use-theme';
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
    'Área de membros da Loja Pronta Prime. Aprenda a vender na Shopee ou acompanhe a montagem da sua loja.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // O script do tema põe a classe `dark` antes do React chegar: a diferença é esperada.
    <html
      lang="pt-BR"
      className={`${manrope.variable} ${inconsolata.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* Antes de tudo: quem escolheu o escuro não vê um clarão ao abrir a página. */}
        <Script id="tema" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        {/* Barra do navegador no celular na cor do fundo. Fora do `viewport` do Next de propósito: a
            cada navegação ele reescreveria a cor clara por cima da escura. O React leva pro head. */}
        <meta name="theme-color" content={THEME_COLORS.light} />
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
