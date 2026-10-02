'use client';

import { WifiOffIcon } from 'lucide-react';
import { unstable_rethrow, usePathname } from 'next/navigation';
import { Component, Fragment, type ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type State = { error?: unknown; attempt: number };

/** Depois disso, o erro se repete ao mostrar a tela de novo: não é rede, é bug. */
const MAX_RECOVERIES = 2;

/**
 * Falha no envio de um formulário de acesso (internet caiu, servidor fora do ar): o React leva
 * o erro pro error boundary mais próximo, e sem este a aluna veria a página de erro genérica e
 * perderia o que digitou. Aqui a tela volta, com um aviso do que houve; o email digitado é
 * restaurado (ver submitWithoutReset).
 *
 * Fica em volta das telas de acesso (layout), sem tocar nos formulários: eles continuam usando
 * as Server Actions direto, que é o que faz o envio funcionar sem JavaScript.
 */
class ActionErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { attempt: 0 };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error };
  }

  override componentDidCatch(error: unknown) {
    console.error('[acesso] falha ao enviar o formulário', error);
    if (this.state.attempt < MAX_RECOVERIES) {
      this.setState((current) => ({ error: undefined, attempt: current.attempt + 1 }));
    }
  }

  override render() {
    const { error, attempt } = this.state;
    if (error) {
      // Redirecionamento e "não encontrado" do Next também chegam como erro: seguem adiante.
      unstable_rethrow(error);
      if (attempt >= MAX_RECOVERIES) throw error;
      return null;
    }
    return (
      <>
        {attempt > 0 ? (
          <Alert variant="destructive">
            <WifiOffIcon aria-hidden="true" />
            <AlertTitle>Não deu pra falar com o servidor</AlertTitle>
            <AlertDescription>
              Pode ser a sua internet. Confira a conexão e tenta de novo.
            </AlertDescription>
          </Alert>
        ) : null}
        {/* Chave nova: os formulários recomeçam limpos (sem o envio que falhou pendurado). */}
        <Fragment key={attempt}>{this.props.children}</Fragment>
      </>
    );
  }
}

/** Recomeça a cada página: o aviso de uma tela não pode aparecer na seguinte. */
export function AuthErrorRecovery({ children }: { children: ReactNode }) {
  return <ActionErrorBoundary key={usePathname()}>{children}</ActionErrorBoundary>;
}
