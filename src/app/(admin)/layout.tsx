import type { ReactNode } from 'react';
import { AdminFrame } from '@/features/admin/components/admin-shell';
import { hasAdminRole } from '@/features/admin/access';
import { readStaffFrameSession } from '@/features/support/server/staff-guard';
import { hasStaffPermission, STAFF_PERMISSIONS } from '@/features/support/staff-access';

/**
 * A moldura do painel mora aqui, e não em cada página: ao trocar de seção, o menu fica parado e só
 * o conteúdo muda (com o esboço de carregamento enquanto a página nova não chega). Os contatos (`/leads`) ficam no mesmo
 * grupo pra a moldura não se refazer ao ir e voltar deles. A moldura se desenha pra qualquer
 * pessoa da equipe (atendente, supervisor, administrador); o menu mostra só o que o cargo usa e
 * cada página confere a própria permissão. Sem permissão, nada de moldura: a guarda da página
 * manda pro login (com a volta pra cá) ou pra página não encontrada.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await readStaffFrameSession();
  if (!session) return children;
  const { role } = session.user;
  const access = {
    admin: hasAdminRole(role),
    permissions: STAFF_PERMISSIONS.filter((permission) => hasStaffPermission(role, permission)),
  };
  return (
    <AdminFrame account={session.user} access={access}>
      {children}
    </AdminFrame>
  );
}
