import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { panelCard } from '@/features/member/components/area-shell';
import { SllAreaShell } from '@/features/sll/sll-area-shell';
import { SllLessonViewer } from '@/features/sll/components/sll-lesson-viewer';
import { getFirstSllPublishedTrack } from '@/features/sll/server/catalog';
import { getSllLessonViewer } from '@/features/sll/server/lesson-viewer';
import { requireProduct } from '@/features/products/server/access';

export const metadata: Metadata = { title: 'Comece aqui · SLL' };

const WELCOME_MESSAGE =
  'Antes de começar as aulas, assista a esta mensagem da Pri. Ela vai te mostrar como aproveitar o SLL com clareza, no seu ritmo e com um caminho simples para começar.';

/** Trilha de boas-vindas: seis aulas, progresso individual e entrada para a Etapa 1. */
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ aula?: string | string[] }>;
}) {
  const { aula } = await searchParams;
  const [{ session, products }, welcome, method] = await Promise.all([
    requireProduct('sll'),
    getFirstSllPublishedTrack('welcome'),
    getFirstSllPublishedTrack('method'),
  ]);
  const lessonIds =
    welcome?.stages.flatMap((stage) =>
      stage.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id)),
    ) ?? [];
  const firstLessonId =
    typeof aula === 'string' && lessonIds.includes(aula)
      ? aula
      : (welcome?.resumeLessonId ?? lessonIds[0]);
  // Guarda a aula no endereço: salvar a conclusão atualiza o progresso, sem trocar o vídeo
  // sozinha quando o servidor recalcula qual é a próxima aula para retomar.
  if (firstLessonId && aula !== firstLessonId) {
    redirect(`/sll/comece-aqui?aula=${firstLessonId}`);
  }
  const lesson = firstLessonId ? await getSllLessonViewer(firstLessonId) : null;

  return (
    <SllAreaShell
      account={session.user}
      hasChoice={products.length > 1}
      title={welcome?.title ?? 'Comece aqui'}
      intro={welcome?.description ?? WELCOME_MESSAGE}
    >
      {lesson && welcome ? (
        <SllLessonViewer
          key={lesson.lesson.id}
          data={lesson}
          progress={{ completedCount: welcome.completedCount, totalCount: welcome.totalCount }}
          completedHref={method?.totalCount ? '/sll/metodo' : null}
        />
      ) : (
        <section className={panelCard}>
          <p className="text-body text-muted-foreground">
            A trilha de boas-vindas ainda não está disponível.
          </p>
        </section>
      )}
    </SllAreaShell>
  );
}
