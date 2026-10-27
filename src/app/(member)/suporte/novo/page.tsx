import { randomUUID } from 'node:crypto';
import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { AreaShell, panelCard } from '@/features/member/components/area-shell';
import { requireStudent } from '@/features/products/server/access';
import { topicsForProducts } from '@/features/support/catalog';
import { NewTicketForm } from '@/features/support/components/new-ticket-form';
import { loadSupportCatalog } from '@/features/support/server/catalog';
import { loadSupportFrame } from '@/features/support/server/page-data';
import { listActiveFaqAnswers, listActiveKnownIssues, listMyOpenTickets } from '@/features/support/server/queries';
import { deadlineMinutesFor } from '@/features/support/server/settings';
import { whatsappContactFor } from '@/features/support/whatsapp';
import { getParam, type SearchParams } from '@/lib/search-params';
import { db } from '@/server/db';
import { learningLessons } from '@/server/db/schema';

export const metadata: Metadata = { title: 'Abrir chamado' };

const uuid = z.uuid();

async function lessonTitle(id: string): Promise<string | null> {
  if (!uuid.safeParse(id).success) return null;
  const [lesson] = await db.select({ title: learningLessons.title }).from(learningLessons).where(eq(learningLessons.id, id)).limit(1);
  return lesson?.title ?? null;
}

/**
 * Novo chamado guiado. Outras telas trazem o contexto pela URL (`?tema=&situacao=&aula=&fase=
 * &erro=&pagina=`), que o servidor confere de novo ao gravar.
 */
export default async function NewTicketPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { session, products } = await requireStudent('/suporte/novo');
  const params = await searchParams;
  const value = (key: string) => (getParam(params[key]) ?? '').slice(0, 200);
  const [catalog, frame, faqAnswers, openTickets, knownIssues, title] = await Promise.all([
    loadSupportCatalog(),
    loadSupportFrame(),
    listActiveFaqAnswers(),
    listMyOpenTickets(session.user.id),
    listActiveKnownIssues(),
    lessonTitle(value('aula')),
  ]);
  const phase = Number(value('fase'));
  const validPhase = Number.isInteger(phase) && phase >= 1 && phase <= 7;
  const contextLabel = title ? `Aula: ${title}` : validPhase ? `Fase ${phase} da Loja Pronta` : value('erro') ? `Código do erro ${value('erro').slice(0, 64)}` : null;
  // Só os temas dos produtos que a aluna tem (e os que valem pros dois).
  const active = topicsForProducts(catalog.filter((topic) => topic.active), products);
  const errorFromUrl = getParam(params.erro_envio) ?? null;

  return (
    <AreaShell
      account={session.user}
      hasChoice
      narrow
      crumb="Abrir chamado"
      title="Abrir chamado"
      intro="Responda três perguntas rápidas. Assim o chamado já chega pra pessoa certa."
    >
      <section className={panelCard} aria-label="Novo chamado">
        <NewTicketForm
          catalog={active}
          faqAnswers={faqAnswers}
          openTickets={openTickets}
          knownIssues={knownIssues}
          whatsappByTopic={Object.fromEntries(active.map((topic) => [topic.id, whatsappContactFor(frame.phones, topic.id)]))}
          deadlines={{ normal: deadlineMinutesFor(frame.settings, 'normal'), high: deadlineMinutesFor(frame.settings, 'high') }}
          hours={frame.hours}
          notice={frame.notice}
          pause={frame.pause}
          initial={{
            topicId: value('tema'),
            situationId: value('situacao'),
            lessonId: value('aula'),
            phase: validPhase ? String(phase) : '',
            errorDigest: value('erro').slice(0, 64),
            pagePath: value('pagina'),
            contextLabel,
            submissionId: randomUUID(),
          }}
          error={errorFromUrl}
        />
      </section>
    </AreaShell>
  );
}
