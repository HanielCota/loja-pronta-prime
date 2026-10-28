export async function GET() {
  return Response.json(
    { message: 'O atendimento agora é pelo WhatsApp.', redirectTo: '/suporte/acesso' },
    { status: 410 },
  );
}
