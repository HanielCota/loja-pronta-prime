import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { hotmartSettings } from '@/server/db/schema';
import { parseHotmartEvent } from '@/features/hotmart/event';
import { decryptHottok, verifyHottok } from '@/features/hotmart/server/secret';
import {
  isRetryableHotmartResult,
  processHotmartEvent,
} from '@/features/hotmart/server/process-event';
import { readLimitedBody, RequestBodyTooLargeError } from '@/lib/request-body';

export async function POST(request: Request) {
  const setting = await db.query.hotmartSettings.findFirst({
    where: eq(hotmartSettings.id, 'main'),
  });
  if (!setting) {
    return NextResponse.json({ error: 'Integração não configurada.' }, { status: 503 });
  }

  const received = request.headers.get('x-hotmart-hottok');
  let authorized = false;
  let unreadable = false;
  for (const encrypted of [setting.encryptedHottok, setting.encryptedSecondaryHottok]) {
    if (encrypted === null) {
      continue;
    }

    try {
      authorized = verifyHottok(received, decryptHottok(encrypted)) || authorized;
    } catch {
      unreadable = true;
    }
  }

  if (unreadable) {
    console.error('[hotmart] A saved token could not be decrypted. Re-enter it in /admin/hotmart.');
  }

  if (!authorized) {
    if (unreadable) {
      return NextResponse.json({ error: 'Integração indisponível.' }, { status: 503 });
    }

    return NextResponse.json({ error: 'Aviso não autorizado.' }, { status: 401 });
  }

  let data: unknown;
  try {
    const bytes = await readLimitedBody(request, 64_000);
    data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError)
      return NextResponse.json({ error: 'Aviso muito grande.' }, { status: 413 });
    return NextResponse.json({ error: 'Aviso inválido.' }, { status: 400 });
  }
  const parsed = parseHotmartEvent(data);
  if (!parsed.success) return NextResponse.json({ error: 'Aviso incompleto.' }, { status: 400 });
  try {
    const result = await processHotmartEvent(parsed.data);
    // A mesma lista que o processamento reabre: responder 200 a um deles faria a Hotmart parar de
    // reenviar, e uma compra sem data ficaria sem acesso para sempre.
    return NextResponse.json({ result }, { status: isRetryableHotmartResult(result) ? 503 : 200 });
  } catch (error) {
    console.error(
      '[hotmart] Falha no processamento:',
      error instanceof Error ? error.name : 'erro desconhecido',
    );
    return NextResponse.json({ error: 'Não foi possível processar o aviso.' }, { status: 500 });
  }
}
