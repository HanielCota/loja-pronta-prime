import { NextResponse } from 'next/server';
import { ENHANCED_SUBMIT_FIELD } from '@/lib/forms';
import { withNotice } from '../send-notice';

/**
 * Os formulários do suporte com anexo vão pra rotas (o limite das Server Actions é 6 MB). Com
 * JavaScript, a tela recebe JSON e mostra o erro sem apagar o texto; sem JavaScript, a rota
 * redireciona (303) pra página certa, com o erro na URL.
 */
export type RouteOutcome =
  /** `notice`: deu certo, mas algo ficou de fora (ex.: um anexo recusado). */
  | { ok: true; redirectTo: string; notice?: string | null }
  | { ok: false; message: string; status: number; backTo: string; field?: string };

export function isEnhanced(form: FormData): boolean {
  return form.get(ENHANCED_SUBMIT_FIELD) === '1';
}

export function respond(request: Request, enhanced: boolean, outcome: RouteOutcome) {
  const headers = { 'Cache-Control': 'no-store' };
  if (enhanced) {
    if (outcome.ok)
      return NextResponse.json(
        { ok: true, redirectTo: withNotice(outcome.redirectTo, outcome.notice), notice: outcome.notice ?? null },
        { headers },
      );
    return NextResponse.json(
      { ok: false, message: outcome.message, field: outcome.field ?? null },
      { status: outcome.status, headers },
    );
  }
  if (outcome.ok) return NextResponse.redirect(new URL(withNotice(outcome.redirectTo, outcome.notice), request.url), 303);
  const back = new URL(outcome.backTo, request.url);
  // `erro` já é o código de erro que vem das páginas de erro: a mensagem do envio tem nome próprio.
  back.searchParams.set('erro_envio', outcome.message);
  return NextResponse.redirect(back, 303);
}

export function text(form: FormData, field: string, max = 6000): string {
  const value = form.get(field);
  if (typeof value !== 'string') return '';
  return value.slice(0, max);
}
