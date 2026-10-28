import { visitForRoute } from '@/features/support/server/impersonation';

export async function POST() {
  await visitForRoute('requestTicketAccess');
  return Response.json(
    { message: 'O atendimento agora é pelo WhatsApp.', redirectTo: '/suporte/acesso' },
    { status: 410 },
  );
}
