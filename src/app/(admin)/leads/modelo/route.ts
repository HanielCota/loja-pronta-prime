import { requireAdmin } from '@/features/admin/server/access';
import { CSV_HEADERS, writeCsv } from '@/features/leads/csv';

export async function GET() {
  await requireAdmin('/leads/importar');
  return new Response(writeCsv([[...CSV_HEADERS]]), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="modelo-leads.csv"',
      'Cache-Control': 'private, no-store',
    },
  });
}
