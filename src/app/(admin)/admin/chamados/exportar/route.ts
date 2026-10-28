import { describeTopic } from '@/features/support/catalog';
import { PRIORITY_LABELS, STATUS_LABELS } from '@/features/support/copy';
import { hasStaffPermission } from '@/features/support/staff-access';
import { loadSupportCatalog } from '@/features/support/server/catalog';
import { requireStaff } from '@/features/support/server/staff-guard';
import { writeCsv } from '@/features/leads/csv';
import { parseStaffFilters } from '@/features/support-desk/filters';
import { listStaffTickets } from '@/features/support-desk/server/queries';

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
const formatDate = (value: Date | null) => (value ? dateFormat.format(value) : '');

/** CSV da fila com os filtros atuais (supervisor e administrador), até 10.000 chamados. */
export async function GET(request: Request) {
  const session = await requireStaff('/admin/chamados', 'support.metrics');
  const { user } = session;
  const filters = parseStaffFilters(new URL(request.url).searchParams, hasStaffPermission(user.role, 'support.ombudsman'));
  const [list, catalog] = await Promise.all([
    listStaffTickets({ id: user.id, role: user.role }, filters, new Date(), { all: true }),
    loadSupportCatalog(),
  ]);
  if (list.rows.length > 10_000)
    return new Response('A exportação aceita até 10.000 chamados. Use os filtros pra exportar uma lista menor.', {
      status: 422,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, no-store' },
    });
  const csv = writeCsv([
    ['Número', 'Assunto', 'Aluna', 'E-mail', 'Tema', 'O que está acontecendo', 'Prioridade', 'Situação', 'Responsável', 'Canal', 'Aberto em', 'Primeira resposta', 'Encerrado em', 'Nota'],
    ...list.rows.map((row) => {
      const { topic, situation } = describeTopic(catalog, row.topicId, row.situationId);
      return [
        String(row.number),
        row.subject,
        row.requesterName,
        row.requesterEmail,
        topic,
        situation ?? '',
        PRIORITY_LABELS[row.priority],
        STATUS_LABELS[row.status],
        row.assigneeName ?? 'Sem responsável',
        row.channel === 'public_form' ? 'Formulário de acesso' : 'Plataforma',
        formatDate(row.createdAt),
        formatDate(row.firstResponseAt),
        formatDate(row.closedAt),
        row.rating ? String(row.rating) : '',
      ];
    }),
  ]);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="chamados.csv"',
      'Cache-Control': 'private, no-store',
    },
  });
}
