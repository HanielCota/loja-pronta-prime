import type { Metadata } from 'next';
import { Avatar } from '@/components/ui/avatar';
import { TEAM_WHATSAPP } from '@/config/support';
import { ProfileSettings } from '@/features/auth/components/profile-forms';
import { SignOutRow } from '@/features/auth/components/sign-out-button';
import { whatsappLink } from '@/features/loja-pronta/whatsapp';
import { greetingName } from '@/features/products/names';
import { AreaShell } from '@/features/member/components/area-shell';
import { requireStudent } from '@/features/products/server/access';

export const metadata: Metadata = {
  title: 'Seu perfil',
};

/**
 * Perfil: quem ela é no topo (as iniciais, o nome e o email) e os ajustes embaixo, em listas que
 * abrem o formulário na própria linha. Cada parte salva sozinha: quem só quer trocar o nome não
 * passa pela senha. Uma coluna estreita, no celular e no computador.
 */
export default async function ProfilePage() {
  const { session } = await requireStudent('/perfil');
  const { user } = session;
  const name = greetingName(user);
  const profileName = user.preferredName?.trim() || user.name;

  return (
    // O voltar sempre aparece: o início leva pra área certa, mesmo de quem tem um produto só.
    <AreaShell
      account={user}
      hasChoice
      narrow
      title="Seu perfil"
      header={
        <div className="mt-2 flex items-center gap-4 sm:gap-5">
          {/* A mesma foto (ou iniciais) do canto do topo. */}
          <Avatar name={profileName} image={user.image} className="size-16 text-title sm:size-20" />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-title font-semibold text-balance wrap-anywhere sm:text-title-lg">
              {name || 'Seu perfil'}
            </h1>
            <p className="text-body wrap-anywhere text-muted-foreground">{user.email}</p>
          </div>
        </div>
      }
    >
      <ProfileSettings
        name={profileName}
        email={user.email}
        image={user.image}
        emailHelp={
          <>
            Pra trocar o email,{' '}
            {TEAM_WHATSAPP ? (
              <a
                href={whatsappLink(TEAM_WHATSAPP, 'Oi! Quero trocar o email da minha conta.')}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-link underline underline-offset-4"
              >
                fale com o suporte no WhatsApp
                <span className="sr-only"> (abre em outra aba)</span>
              </a>
            ) : (
              'fale com o suporte'
            )}
            .
          </>
        }
      />
      <SignOutRow />
    </AreaShell>
  );
}
