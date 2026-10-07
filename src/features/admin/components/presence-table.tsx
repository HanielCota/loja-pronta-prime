import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { DeviceClient, DeviceInfo } from '@/features/presence/device';
import { formatLastSeen, type PresencePlace } from '@/features/presence/presence';
import { DeviceLabel } from './device-label';
import { cn } from '@/lib/utils';

export type PresenceRow = PresencePlace & {
  userId: string;
  name: string;
  email: string;
  lastSeenAt: Date;
  /** Título da aula aberta, quando ela está numa aula. */
  lessonTitle: string | null;
  /** O aparelho em palavras (null nos avisos de antes do aparelho existir). */
  device: DeviceInfo | null;
  /** O que o navegador contou (tela, idioma, fuso...), pros detalhes da conta. */
  deviceClient: DeviceClient;
};

/** Etiqueta da área (o texto diz qual; a cor só reforça). */
export function AreaTag({ area }: { area: string | null }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-0.5 text-sm font-medium whitespace-nowrap forced-colors:border forced-colors:border-[CanvasText]',
        area ? 'bg-primary-soft text-link' : 'bg-muted text-foreground',
      )}
    >
      {area ?? 'Outra página'}
    </span>
  );
}

/** "Onde": a página em palavras e, na aula, o título dela. */
export function PresencePlaceText({ row }: { row: PresenceRow }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate text-body text-foreground">{row.page}</span>
      {row.lessonTitle ? (
        <span className="truncate text-sm text-muted-foreground">{row.lessonTitle}</span>
      ) : null}
    </span>
  );
}

/** Quem está online: tabela no computador, lista no celular. */
export function PresenceTable({ rows, now }: { rows: PresenceRow[]; now: Date }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-body">
          <thead>
            <tr className="border-b border-border text-sm text-muted-foreground">
              <th className="py-3 pr-4 pl-3 font-semibold" scope="col">
                Aluna
              </th>
              <th className="py-3 pr-4 font-semibold" scope="col">
                Área
              </th>
              <th className="py-3 pr-4 font-semibold" scope="col">
                Onde está
              </th>
              <th className="py-3 pr-4 font-semibold" scope="col">
                Aparelho
              </th>
              <th className="py-3 pr-4 font-semibold whitespace-nowrap" scope="col">
                Último sinal
              </th>
              <th className="py-3" scope="col">
                <span className="sr-only">Abrir</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr
                className="relative hover:bg-muted motion-safe:transition-colors motion-safe:duration-150"
                key={row.userId}
              >
                <td className="max-w-0 py-3 pr-4 pl-3 lg:w-[26%]">
                  <Link
                    className="block truncate font-semibold text-foreground outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
                    href={`/admin/contas/${row.userId}`}
                  >
                    {row.name}
                  </Link>
                  <span className="block truncate text-sm text-muted-foreground">{row.email}</span>
                </td>
                <td className="py-3 pr-4">
                  <AreaTag area={row.area} />
                </td>
                <td className="max-w-0 py-3 pr-4 lg:w-[26%]">
                  <PresencePlaceText row={row} />
                </td>
                <td className="max-w-0 py-3 pr-4 lg:w-[22%]">
                  <DeviceLabel device={row.device} />
                </td>
                <td className="py-3 pr-4 text-sm whitespace-nowrap text-muted-foreground">
                  {formatLastSeen(row.lastSeenAt, now)}
                </td>
                <td className="py-3 pr-3 text-right">
                  <ChevronRight
                    aria-hidden="true"
                    className="inline size-5 text-muted-foreground"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border md:hidden">
        {rows.map((row) => (
          <li key={row.userId}>
            <Link
              className="-mx-3 flex min-h-11 items-center gap-3 rounded-2xl px-3 py-4 outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              href={`/admin/contas/${row.userId}`}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-body font-semibold text-foreground">{row.name}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <AreaTag area={row.area} />
                  <span className="text-sm text-muted-foreground">
                    {formatLastSeen(row.lastSeenAt, now)}
                  </span>
                </span>
                <PresencePlaceText row={row} />
                <DeviceLabel device={row.device} />
              </span>
              <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
