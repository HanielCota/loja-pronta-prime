import { visitForRoute } from '@/features/staff/server/impersonation';

export async function POST() {
  await visitForRoute('sendTicketMessage');
  return Response.json(
    { message: 'O atendimento agora é pelo WhatsApp.', redirectTo: '/suporte/acesso' },
    { status: 410 },
  );
}
