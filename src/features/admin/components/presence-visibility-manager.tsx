import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { panelCard } from '@/features/member/components/area-shell';
import { changeStudentPresenceVisibility } from '../server/actions';

const messages: Record<string, string> = {
  saved: 'Visibilidade online atualizada.',
  missing: 'Não encontrei uma conta com esse email.',
  invalid: 'Digite um email válido.',
};

export function PresenceVisibilityManager({
  accounts,
  result,
}: {
  accounts: { id: string; name: string; email: string }[];
  result?: string | undefined;
}) {
  return (
    <section className={`${panelCard} mt-6 gap-5`} aria-labelledby="presence-visibility-title">
      <div>
        <h2 id="presence-visibility-title" className="text-title font-semibold">
          Visibilidade online
        </h2>
        <p className="mt-2 text-body text-muted-foreground">
          As alunas ocultas não aparecem para ninguém nas listas de pessoas online, nos contadores
          nem nos detalhes da última atividade. Elas continuam entrando e acessando os produtos
          normalmente. Só sua conta pode alterar esta lista.
        </p>
      </div>
      <form
        action={changeStudentPresenceVisibility}
        className="flex flex-col gap-3 sm:flex-row sm:items-start"
      >
        <div className="flex-1">
          <FloatingLabelInput
            id="presence-hide-email"
            name="email"
            type="email"
            label="Email da aluna"
            autoComplete="off"
            maxLength={254}
            required
          />
        </div>
        <Button name="visibility" value="hidden" size="inline" variant="soft">
          Ocultar presença online
        </Button>
      </form>
      {result && messages[result] ? (
        <output aria-live="polite" className="text-body text-muted-foreground">
          {messages[result]}
        </output>
      ) : null}
      <h3 className="text-body font-semibold">Alunas ocultas</h3>
      {accounts.length ? (
        <ul className="divide-y divide-border">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-body font-semibold break-words">{account.name}</p>
                <p className="text-sm break-all text-muted-foreground">{account.email}</p>
              </div>
              <form action={changeStudentPresenceVisibility}>
                <input type="hidden" name="email" value={account.email} />
                <Button
                  name="visibility"
                  value="visible"
                  size="inline"
                  variant="soft"
                  aria-label={`Mostrar presença online de ${account.name}`}
                >
                  Mostrar novamente
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body text-muted-foreground">Nenhuma aluna está oculta.</p>
      )}
    </section>
  );
}
