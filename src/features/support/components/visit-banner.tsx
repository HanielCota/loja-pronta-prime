import { Eye } from 'lucide-react';
import { BLOCKED_SUMMARY } from '../visit-rules';
import { LeaveVisitButton } from './leave-visit-button';

const timeFormat = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

/**
 * A faixa fixa enquanto alguém da equipe está na conta da aluna: de quem é a conta, até quando, o
 * que fica bloqueado (em telas maiores) e o caminho de volta (alvo de 44px). Fica em toda página
 * da área das alunas.
 */
export function VisitBanner({ name, until }: { name: string; until: Date }) {
  return (
    <aside
      aria-label="Acesso à conta da aluna"
      className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-3 bg-primary px-4 py-2 text-body text-primary-foreground"
    >
      <Eye aria-hidden="true" className="size-5 shrink-0" />
      <div className="min-w-0 text-pretty">
        <p>
          Você está usando a conta de <strong className="font-semibold">{name}</strong> até{' '}
          {timeFormat.format(until)}.
          <span className="hidden sm:inline">
            {' '}
            Tudo o que fizer fica registrado com o seu nome.
          </span>
        </p>
        <p className="hidden md:block">{BLOCKED_SUMMARY}</p>
      </div>
      <LeaveVisitButton className="bg-primary-foreground px-5 font-semibold text-primary hover:bg-primary-foreground/90 focus-visible:outline-primary-foreground" />
    </aside>
  );
}
