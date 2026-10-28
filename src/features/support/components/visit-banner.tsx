import { Eye } from 'lucide-react';
import { stopVisitAction } from '@/features/support-desk/server/actions';

const timeFormat = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

/**
 * A faixa fixa enquanto alguém da equipe está na conta da aluna: de quem é a conta, até quando,
 * e o caminho de volta (alvo de 44px). Fica em toda página da área das alunas.
 */
export function VisitBanner({ name, until }: { name: string; until: Date }) {
  return (
    <aside
      aria-label="Visita à conta da aluna"
      className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-3 bg-primary px-4 py-2 text-body text-primary-foreground"
    >
      <Eye aria-hidden="true" className="size-5 shrink-0" />
      <p className="min-w-0 text-pretty">
        Você está usando a conta de <strong className="font-semibold">{name}</strong> até {timeFormat.format(until)}.
        <span className="hidden sm:inline"> Tudo o que fizer fica registrado com o seu nome.</span>
      </p>
      <form action={stopVisitAction}>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-full bg-primary-foreground px-5 text-body font-semibold text-primary outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
        >
          Voltar ao admin
        </button>
      </form>
    </aside>
  );
}
