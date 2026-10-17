import { hasHealthyAssistantWorker } from '@/server/runtime-health';

export const dynamic = 'force-dynamic';
export async function GET() {
  let ok = false;
  try {
    ok = await hasHealthyAssistantWorker();
  } catch {
    /* A saúde não expõe erros ou configuração. */
  }
  return Response.json(
    { ok },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
