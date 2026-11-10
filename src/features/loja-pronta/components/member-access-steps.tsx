import { ExternalLinkIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { PasswordInput } from '@/components/ui/password-input';
import { SHOPEE_SELLER_URL, SHOPEE_SUBACCOUNT_URL } from '@/config/shopee';

/** Link da Shopee em outra aba: ela volta aqui pra colar o acesso. */
function ShopeeLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button asChild variant="soft">
      <a href={href} target="_blank" rel="noreferrer">
        {children}
        <ExternalLinkIcon aria-hidden="true" />
        <span className="sr-only"> (abre em outra aba)</span>
      </a>
    </Button>
  );
}

/**
 * O caminho oficial da Shopee pra dar acesso à loja sem passar a senha da loja: conta principal,
 * loja vinculada e um membro com a função Merchandiser (guia "Como cadastrar Subcontas", junho de
 * 2026). A aluna cola aqui o ID e a senha desse membro. Os nomes dos menus seguem a Shopee.
 */
export function MemberAccessSteps({ invalid }: { invalid: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-body font-semibold">Libere o acesso à sua loja</h3>
      <p className="text-body text-muted-foreground">
        Faça pelo computador. Você cria um acesso só pra publicação e continua com a senha da sua
        loja só com você.
      </p>
      <ol className="flex list-decimal flex-col gap-3 pl-6 text-body">
        <li>
          Na Central do Vendedor, abra <strong>Loja</strong>, depois{' '}
          <strong>Configurações da Loja</strong> e <strong>Conta e Segurança</strong>. Em{' '}
          <strong>Gerenciamento de Subconta</strong>, clique em <strong>Vincular</strong> e em{' '}
          <strong>Usar conta principal</strong>.
        </li>
        <li>
          Preencha seus dados, crie o login e a senha da conta principal e confirme o código que
          chega no seu celular.
        </li>
        <li>
          Entre na Plataforma de Subcontas com a conta principal. Em <strong>Minha Loja</strong>, na
          aba <strong>Pendente</strong>, clique em <strong>Autorizar agora</strong> e entre com o
          login da sua loja pra confirmar.
        </li>
        <li>
          Em <strong>Minha Equipe</strong>, abra <strong>Membros</strong> e clique em{' '}
          <strong>Criar um Membro</strong>. Use uma senha nova, escolha a função{' '}
          <strong>Merchandiser</strong> e adicione a sua loja.
        </li>
        <li>No fim, copie o ID de login e a senha do membro e cole aqui embaixo.</li>
      </ol>
      <div className="grid gap-3 md:grid-cols-2">
        <ShopeeLink href={SHOPEE_SELLER_URL}>Abrir a Central do Vendedor</ShopeeLink>
        <ShopeeLink href={SHOPEE_SUBACCOUNT_URL}>Abrir a Plataforma de Subcontas</ShopeeLink>
      </div>
      {invalid ? (
        <p id="member-access-error" role="alert" className="text-body text-destructive">
          Confira o ID e a senha do membro. O ID fica assim: suaconta:membro.
        </p>
      ) : null}
      <FloatingLabelInput
        id="member-login"
        name="memberLogin"
        label="ID de login do membro"
        required
        maxLength={101}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-describedby={invalid ? 'member-access-error member-login-help' : 'member-login-help'}
        aria-invalid={invalid || undefined}
      />
      <p id="member-login-help" className="text-body text-muted-foreground">
        Fica assim: suaconta:membro.
      </p>
      <PasswordInput
        id="member-password"
        name="memberPassword"
        label="Senha do membro"
        required
        minLength={8}
        maxLength={64}
        autoComplete="new-password"
        aria-describedby={invalid ? 'member-access-error' : undefined}
        aria-invalid={invalid || undefined}
      />
      <p className="text-body text-muted-foreground">
        A senha fica guardada com segurança e é apagada quando sua loja estiver pronta. Depois, você
        pode excluir esse membro na Plataforma de Subcontas.
      </p>
    </div>
  );
}
