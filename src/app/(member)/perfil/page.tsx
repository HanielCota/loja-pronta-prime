import type { Metadata } from 'next';
import { ChangePasswordForm, ProfileNameForm } from '@/features/auth/components/profile-forms';
import { AreaShell, panelCard, sectionTitleClass } from '@/features/member/components/area-shell';
import { requireStudent } from '@/features/products/server/access';

export const metadata: Metadata = {
  title: 'Seu perfil',
};

/**
 * Perfil: como ela quer ser chamada e a senha. Cada parte salva sozinha, com o próprio botão: quem
 * só quer trocar o nome não precisa passar pela senha.
 */
export default async function ProfilePage() {
  const { session } = await requireStudent('/perfil');
  const { user } = session;

  return (
    // O voltar sempre aparece: o início leva pra área certa, mesmo de quem tem um produto só.
    <AreaShell account={user} hasChoice title="Seu perfil" intro={user.email}>
      <div className="flex w-full max-w-[560px] flex-col gap-6">
        <section aria-labelledby="perfil-nome" className={panelCard}>
          <h2 id="perfil-nome" className={sectionTitleClass}>
            Como quer ser chamada
          </h2>
          <p className="mt-1 mb-5 text-body text-pretty text-muted-foreground">
            É o nome que aparece na saudação e no topo das telas.
          </p>
          <ProfileNameForm name={user.name} />
        </section>

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
