import type { Metadata } from 'next';
import { Avatar } from '@/components/ui/avatar';
import { getSupportPhones } from '@/features/support/server/contacts';
import { SUPPORT_EMAIL } from '@/config/support';
import {
  AccessGroup,
  AttentionGroup,
  DevicesGroup,
  HelpGroup,
} from '@/features/auth/components/profile-groups';
import { ProfileSettings } from '@/features/auth/components/profile-forms';
import { SignOutRow } from '@/features/auth/components/sign-out-button';
import { getAccountDevices } from '@/features/auth/server/devices';
import { whatsappLink } from '@/features/loja-pronta/whatsapp';
import { greetingName } from '@/features/products/names';
import { AreaShell } from '@/features/member/components/area-shell';
import { requireStudent } from '@/features/products/server/access';
import { getAccessValidity } from '@/features/products/server/access-validity';

export const metadata: Metadata = {
  title: 'Seu perfil',
};

/**
 * Perfil: quem ela é no topo (as iniciais, o nome e o email) e os ajustes embaixo, em listas que
 * abrem o formulário na própria linha. Cada parte salva sozinha: quem só quer trocar o nome não
 * passa pela senha. Depois da conta, as áreas dela e até quando valem; depois da senha, os
 * aparelhos com a conta aberta; no fim, onde pedir ajuda.
 * Uma coluna estreita, no celular e no computador.
 */
export default async function ProfilePage() {
  const { session, products } = await requireStudent('/perfil');
  const { user } = session;
  const phones = await getSupportPhones();
  const name = greetingName(user);
  const profileName = user.preferredName?.trim() || user.name;
  const [validity, devices] = await Promise.all([
    getAccessValidity(user.id),
    getAccountDevices(user.id, session.session.id),
  ]);

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
      {/* Antes de tudo, só quando há algo a fazer (o aviso da conta Apple). */}
      <AttentionGroup products={products} validity={validity.byProduct} now={validity.checkedAt} />
      <ProfileSettings
        name={profileName}
        email={user.email}
        image={user.image}
        access={
          <AccessGroup products={products} validity={validity.byProduct} now={validity.checkedAt} />
        }
        devices={<DevicesGroup devices={devices} />}
        help={
          // A âncora "/perfil#suporte" (menu da conta e painel da loja) cai direto aqui.
          <div id="suporte" className="flex scroll-mt-24 flex-col gap-8">
            <HelpGroup phones={phones} />
          </div>
        }
        emailHelp={
          <>
            Pra trocar o email,{' '}
            {phones.technical ? (
              <a
                href={whatsappLink(phones.technical, 'Oi! Quero trocar o email da minha conta.')}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-link underline underline-offset-4"
              >
                fale com o suporte no WhatsApp
                <span className="sr-only"> (abre em outra aba)</span>
              </a>
            ) : (
              <>
                escreva pro suporte em{' '}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="font-semibold text-link underline underline-offset-4"
                >
                  {SUPPORT_EMAIL}
                </a>
              </>
            )}
            .
          </>
        }
      />
      <SignOutRow />
    </AreaShell>
  );
}
