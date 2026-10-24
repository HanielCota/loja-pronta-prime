import type { ReactNode } from 'react';
import { NavigationPending } from '@/components/ui/navigation-pending';
import { PageLoading } from '@/components/ui/page-loading';
import { PageMain } from '@/components/ui/page-main';
import { AreaFrame } from '@/features/member/components/area-shell';
import { readProductAccess } from '@/features/products/server/access';
import { MEMBER_AREA_GUTTERS } from '@/lib/member-layout';
import { cn } from '@/lib/utils';

/**
 * A barra do topo do painel da Loja Pronta mora aqui, e não em cada página: ao trocar de página,
 * ela fica parada e só o conteúdo muda (com o esboço de carregamento, no mesmo `<main>` e na
 * mesma largura das páginas, enquanto a página nova não chega). Os passos (a conversa, a marca,
 * a Shopee) têm molduras próprias e ficam fora deste grupo. Sem acesso, nada de moldura: a guarda
 * da página manda pro login (com a volta pra cá) ou pro início.
 */
export default async function LojaProntaPanelLayout({ children }: { children: ReactNode }) {
  const access = await readProductAccess('loja-pronta');
  if (!access) return children;
  return (
    <AreaFrame
      account={access.session.user}
      hasChoice={access.products.length > 1}
      area="loja-pronta"
    >
      <NavigationPending
        fallback={
          <PageMain
            className={cn('mx-auto w-full max-w-[1040px] pt-6 pb-12 sm:pt-8', MEMBER_AREA_GUTTERS)}
          >
            <PageLoading />
          </PageMain>
        }
      >
        {children}
      </NavigationPending>
    </AreaFrame>
  );
}
