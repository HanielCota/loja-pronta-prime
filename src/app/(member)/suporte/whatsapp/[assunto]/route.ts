import { NextResponse } from 'next/server';
import { getSessionState } from '@/features/auth/server/session';
import { getSupportPhones } from '@/features/support/server/contacts';
import { visitForRoute } from '@/features/support/server/impersonation';
import { isWhatsappTopic, whatsappContacts, whatsappHref } from '@/features/support/whatsapp';
import { db } from '@/server/db';
import { supportWhatsappClicks } from '@/server/db/schema';

/**
 * Os links de WhatsApp das telas novas passam por aqui: conta o clique (assunto, de onde veio e,
 * logada, quem; nunca conteúdo) e manda pro WhatsApp com a mesma mensagem do Perfil. Assunto sem
 * número volta pro suporte, onde aparece "Em breve".
 */
export async function GET(request: Request, { params }: { params: Promise<{ assunto: string }> }) {
  const { assunto } = await params;
  if (!isWhatsappTopic(assunto)) return new Response('Não encontrado.', { status: 404 });
  const url = new URL(request.url);
  const source = url.searchParams.get('origem') === 'login' ? 'login' : 'platform';
  const contact = whatsappContacts(await getSupportPhones()).find((item) => item.topic === assunto);
  const href = contact ? whatsappHref(contact) : null;
  if (!href) return NextResponse.redirect(new URL(source === 'login' ? '/suporte/acesso' : '/suporte', request.url), 303);
  // A equipe dentro da conta da aluna não entra na conta de cliques do suporte.
  if ((await visitForRoute('recordWhatsappClick')).status !== 'student') return NextResponse.redirect(href, 302);
  const state = await getSessionState();
  await db
    .insert(supportWhatsappClicks)
    .values({ topic: assunto, source, userId: state.status === 'active' ? state.session.user.id : null })
    .catch(() => console.error('[support] clique no WhatsApp não registrado.'));
  return NextResponse.redirect(href, 302);
}
