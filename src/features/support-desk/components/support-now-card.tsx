import Link from 'next/link';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { panelCard } from '@/features/member/components/area-shell';
import { cn } from '@/lib/utils';

export type SupportNow = {
  waiting: number;
  late: number;
  unassigned: number;
  available: string[];
  /** "Aberto agora", "Fora do horário" ou "Em pausa". */
  state: string;
};

/** "Suporte agora", no Painel do admin: a fila e quem está atendendo, com o atalho pra fila. */
export function SupportNowCard({ now }: { now: SupportNow }) {
  const items = [
    { label: 'Aguardando', value: now.waiting, href: '/admin/chamados?status=open' },
    { label: 'Atrasados', value: now.late, href: '/admin/chamados?fila=atrasados' },
    { label: 'Sem responsável', value: now.unassigned, href: '/admin/chamados?fila=sem-responsavel' },
  ];
  return (
    <section aria-labelledby="support-now" className={cn(panelCard, 'gap-4 !p-5 sm:!p-6')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="support-now" className="flex items-center gap-2 text-title font-semibold">
          <MessageCircle aria-hidden="true" className="size-5 text-link" />
          Suporte agora
        </h2>
        <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">{now.state}</span>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="flex min-h-11 flex-col gap-1 rounded-2xl bg-muted px-4 py-3 outline-none hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className={cn('text-title font-semibold tabular-nums', item.label === 'Atrasados' && item.value > 0 ? 'text-destructive' : '')}>
                {item.value}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-body text-muted-foreground">
        {now.available.length ? `Disponíveis: ${now.available.join(', ')}.` : 'Ninguém da equipe está disponível agora.'}
      </p>
      <Link href="/admin/chamados" className="inline-flex min-h-11 w-fit items-center gap-2 text-body font-semibold text-link hover:underline">
        Abrir a fila
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </section>
  );
}
