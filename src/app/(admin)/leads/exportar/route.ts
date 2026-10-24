import { requireAdmin } from '@/features/admin/server/access';
import { listLeads } from '@/features/leads/server/queries';
import { parseLeadFilters } from '@/features/leads/model';
import { CSV_HEADERS, writeCsv } from '@/features/leads/csv';

export async function GET(request: Request) {
  await requireAdmin('/leads');
  const { rows } = await listLeads(parseLeadFilters(new URL(request.url).searchParams), true);
  if (rows.length > 10000)
    return new Response(
      'A exportação aceita até 10.000 contatos. Use os filtros para exportar uma lista menor.',
      {
        status: 422,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'private, no-store',
        },
      },
    );
  const csv = writeCsv([
    [...CSV_HEADERS],
    ...rows.map(({ lead }) => [
      lead.name,
      lead.email ?? '',
      lead.phone ?? '',
      lead.source,
      lead.product,
      lead.stage,
      lead.nextContact ?? '',
      lead.tags.join(', '),
      lead.lostReason ?? '',
    ]),
  ]);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="leads.csv"',
      'Cache-Control': 'private, no-store',
    },
  });
}
