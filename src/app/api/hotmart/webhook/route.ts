import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { hotmartSettings } from '@/server/db/schema';
import { parseHotmartEvent } from '@/features/hotmart/event';
import { decryptHottok, verifyHottok } from '@/features/hotmart/server/secret';
import { processHotmartEvent } from '@/features/hotmart/server/process-event';

export async function POST(request: Request) {
  const setting = await db.query.hotmartSettings.findFirst({
    where: eq(hotmartSettings.id, 'main'),
  });
  if (!setting) return NextResponse.json({ error: 'Integração não configurada.' }, { status: 503 });
  let expected: string;
  try {
    expected = decryptHottok(setting.encryptedHottok);
  } catch {
    // Acontece quando BETTER_AUTH_SECRET muda: o token salvo não abre mais. Responder erro
    // temporário mantém a Hotmart reenviando até o token ser salvo de novo no painel.
    console.error(
      '[hotmart] Não foi possível ler o token salvo. Salve o token de novo em /admin/hotmart.',
    );
    return NextResponse.json({ error: 'Integração indisponível.' }, { status: 503 });
  }
  if (!verifyHottok(request.headers.get('x-hotmart-hottok'), expected)) {
    return NextResponse.json({ error: 'Aviso não autorizado.' }, { status: 401 });
  }
  const raw = await request.text();
  if (raw.length > 64_000)
    return NextResponse.json({ error: 'Aviso muito grande.' }, { status: 413 });
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Aviso inválido.' }, { status: 400 });
  }
  const parsed = parseHotmartEvent(data);
  if (!parsed.success) return NextResponse.json({ error: 'Aviso incompleto.' }, { status: 400 });
  try {
    const result = await processHotmartEvent(parsed.data);
    return NextResponse.json(
      { result },
      { status: result === 'Produto sem acesso configurado.' ? 503 : 200 },
    );
  } catch (error) {
    console.error(
      '[hotmart] Falha no processamento:',
      error instanceof Error ? error.name : 'erro desconhecido',
    );
    return NextResponse.json({ error: 'Não foi possível processar o aviso.' }, { status: 500 });
  }
}
