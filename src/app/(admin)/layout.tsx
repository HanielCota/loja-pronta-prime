import type { ReactNode } from 'react';
import { AdminFrame } from '@/features/admin/components/admin-shell';
import { readAdminSession } from '@/features/admin/server/access';

/**
 * A moldura do painel mora aqui, e não em cada página: ao trocar de seção, o menu fica parado e só
 * o conteúdo muda (com o esboço de carregamento enquanto a página nova não chega). Os contatos (`/leads`) ficam no mesmo
 * grupo pra a moldura não se refazer ao ir e voltar deles. Sem permissão, nada de moldura: a
 * guarda da página manda pro login (com a volta pra cá) ou pra página não encontrada.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await readAdminSession();
  if (!session) return children;
  return <AdminFrame account={session.user}>{children}</AdminFrame>;
}
