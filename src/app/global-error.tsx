'use client';

import { Manrope } from 'next/font/google';
import { CardHeading } from '@/components/brand/card-heading';
import { PageShell } from '@/components/brand/page-shell';
import { Button } from '@/components/ui/button';
import { ThemeProvider } from '@/features/theme/use-theme';
import './globals.css';

// O layout raiz não vale aqui: a fonte e o tema vêm deste arquivo (senão, letra serifada e um
// clarão no tema escuro).
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

type GlobalErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

/**
 * Erro no próprio layout raiz (raro): substitui a página inteira, então traz o próprio <html>.
 * Sem este arquivo, o Next mostraria a página crua dele, em inglês e sem `lang`. Fica de fora o
 * mascote: o erro pode ter vindo justamente de algo que ele usa.
 */
export default function GlobalError({ error, retry }: GlobalErrorProps) {
  return (
    <html lang="pt-BR" className={manrope.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <PageShell>
            <section className="flex flex-col gap-6 rounded-card bg-card px-6 py-10 shadow-card sm:px-10">
              <CardHeading
                title="Algo deu errado"
                description="Tente de novo. Se continuar, fale com o suporte."
              />
              <Button type="button" onClick={() => retry()}>
                Tentar de novo
              </Button>
              {error.digest ? (
                // Código pra ajudar o suporte a achar o erro nos logs do servidor.
                <p className="text-center text-sm text-muted-foreground">
                  Código do erro: {error.digest}
                </p>
              ) : null}
            </section>
          </PageShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
