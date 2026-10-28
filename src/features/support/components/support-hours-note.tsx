import { Clock } from 'lucide-react';

/**
 * A linha do horário de atendimento, em todas as telas de suporte da aluna. Fora do horário, a
 * frase de quando a resposta volta fica numa linha própria, na cor do texto: é o que muda a espera.
 */
export function SupportHoursNote({
  hours,
  notice,
  pause,
}: {
  hours: string;
  notice: string | null;
  /** Mensagem de pausa (férias), quando o suporte está pausado. */
  pause?: string | null;
}) {
  return (
    <div className="flex items-start gap-3 text-body">
      <Clock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <p className="text-pretty text-muted-foreground">{hours}</p>
        {pause ? <p className="font-semibold text-pretty text-foreground">{pause}</p> : null}
        {notice && !pause ? <p className="font-semibold text-pretty text-foreground">{notice}</p> : null}
      </div>
    </div>
  );
}
