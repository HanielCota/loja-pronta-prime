'use client';

import { CardHeading } from '@/components/brand/card-heading';
import { PageShell } from '@/components/brand/page-shell';
import { Button } from '@/components/ui/button';
import './globals.css';

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
    <html lang="pt-BR">
      <body>
        <PageShell>
          <section className="flex flex-col gap-6 rounded-card bg-card px-6 py-10 shadow-card sm:px-10">
            <CardHeading
              title="Algo deu errado por aqui"
              description="Não foi culpa sua. Tenta de novo e, se continuar, fala com o suporte."
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
      </body>
    </html>
  );
}
