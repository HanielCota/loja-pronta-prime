import type { Metadata } from 'next';
import { TEAM_WHATSAPP } from '@/config/support';
import { ChangePasswordForm, ProfileNameForm } from '@/features/auth/components/profile-forms';
import { whatsappLink } from '@/features/loja-pronta/whatsapp';
import { greetingName } from '@/features/products/names';
import { AreaShell, panelCard, sectionTitleClass } from '@/features/member/components/area-shell';
import { requireStudent } from '@/features/products/server/access';

export const metadata: Metadata = {
  title: 'Seu perfil',
};

/**
 * Perfil: com que email ela entra, como quer ser chamada e a senha. Cada parte salva sozinha, com
 * o próprio botão: quem só quer trocar o nome não precisa passar pela senha. No computador, a
 * conta e o nome de um lado e a senha do outro.
 */
export default async function ProfilePage() {
  const { session } = await requireStudent('/perfil');
  const { user } = session;

  return (
    // O voltar sempre aparece: o início leva pra área certa, mesmo de quem tem um produto só.
    <AreaShell account={user} hasChoice title="Seu perfil">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="perfil-conta" className={panelCard}>
            <h2 id="perfil-conta" className={sectionTitleClass}>
              Sua conta
            </h2>
            <p className="mt-1 text-body text-pretty text-muted-foreground">
              Você entra com o email
            </p>
            <p className="mt-1 text-body font-semibold wrap-anywhere text-foreground">
              {user.email}
            </p>
            <p className="mt-3 text-body text-pretty text-muted-foreground">
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
            </p>
          </section>

          <section aria-labelledby="perfil-nome" className={panelCard}>
            <h2 id="perfil-nome" className={sectionTitleClass}>
              Como quer ser chamada
            </h2>
            <p className="mt-1 mb-5 text-body text-pretty text-muted-foreground">
              É assim que a gente te chama nas saudações, como “Oi, Ana Paula!”.
            </p>
            <ProfileNameForm name={greetingName(user)} />
          </section>
        </div>

        <section aria-labelledby="perfil-senha" className={panelCard}>
          <h2 id="perfil-senha" className={sectionTitleClass}>
            Senha
          </h2>
          <p className="mt-1 mb-5 text-body text-pretty text-muted-foreground">
            Pra trocar, digite a senha que você usa hoje e depois a nova.
          </p>
          <ChangePasswordForm email={user.email} />
        </section>
      </div>
    </AreaShell>
  );
}
