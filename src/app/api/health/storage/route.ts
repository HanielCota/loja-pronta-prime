import { storage } from '@/server/storage';

export const dynamic = 'force-dynamic';

/** Quanto tempo a última conferência vale: chamadas seguidas não batem no bucket toda vez. */
const CACHE_MS = 30_000;
let last: { ok: boolean; at: number } | null = null;

async function storageResponds(): Promise<boolean> {
  try {
    await storage().check();
    return true;
  } catch (error) {
    // Sem expor a configuração: só o tipo do erro e o código HTTP vão pro log. O HEAD do bucket
    // volta sem corpo, então o nome costuma ser "Unknown": 403 é credencial, 404 é bucket errado.
    const status =
      typeof error === 'object' && error !== null && '$metadata' in error
        ? (error.$metadata as { httpStatusCode?: number }).httpStatusCode
        : undefined;
    console.error(
      `[health] bucket não respondeu: ${error instanceof Error ? error.name : typeof error}${status ? ` (HTTP ${status})` : ''}`,
    );
    return false;
  }
}

/**
 * O bucket dos arquivos (anexos do suporte, logos, vídeos) responde? Fica separado do /api/health
 * de propósito: aquele decide se a hospedagem reinicia o app, e reiniciar não conserta uma
 * credencial errada do bucket. Este é pro monitor externo avisar a equipe antes de uma aluna
 * tentar mandar um print.
 */
export async function GET() {
  if (!last || Date.now() - last.at > CACHE_MS)
    last = { ok: await storageResponds(), at: Date.now() };
  return Response.json(
    { ok: last.ok },
    { status: last.ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
