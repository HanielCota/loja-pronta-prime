import { hasHealthyAssistantWorker } from '@/server/runtime-health';

export const dynamic = 'force-dynamic';
export async function GET() {
  let ok = false;
  try {
    ok = await hasHealthyAssistantWorker();
  } catch (error) {
    // A resposta não expõe erros ou configuração, mas o log precisa separar "banco fora" de
    // "worker parado": os dois davam o mesmo 503 sem nenhum registro.
    console.error(
      `[health] consulta falhou: ${error instanceof Error ? error.name : typeof error}`,
    );
  }
  return Response.json(
    { ok },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
