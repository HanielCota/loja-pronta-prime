import type { ReactNode } from 'react';
import { readProductAccess } from '@/features/products/server/access';
import { SllAreaFrame } from '@/features/sll/sll-area-shell';

/**
 * A moldura do SLL mora aqui, e não em cada página: ao trocar de seção, o menu fica parado e só
 * o conteúdo muda (com o esboço de carregamento enquanto a página nova não chega). Sem acesso, nada de moldura: a guarda
 * da página manda pro login (com a volta pra cá) ou pro início.
 */
export default async function SllLayout({ children }: { children: ReactNode }) {
  const access = await readProductAccess('sll');
  if (!access) return children;
  return (
    <SllAreaFrame account={access.session.user} hasChoice={access.products.length > 1}>
      {children}
    </SllAreaFrame>
  );
}
