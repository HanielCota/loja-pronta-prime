import type { Metadata } from 'next';
import { AreaShell, panelCard } from '@/features/member/components/area-shell';
import { SllLessonViewer } from '@/features/sll/components/sll-lesson-viewer';
import { getFirstSllPublishedTrack } from '@/features/sll/server/catalog';
import { getSllLessonViewer } from '@/features/sll/server/lesson-viewer';
import { requireProduct } from '@/features/products/server/access';

export const metadata: Metadata = { title: 'Comece aqui · SLL' };

const WELCOME_MESSAGE =
  'Antes de começar as aulas, assista a esta mensagem da Pri. Ela vai te mostrar como aproveitar o SLL com clareza, no seu ritmo e com um caminho simples para começar.';

/** Trilha de boas-vindas: seis aulas, progresso individual e entrada para a Etapa 1. */
export default async function WelcomePage() {
  const [{ session, products }, welcome, method] = await Promise.all([
    requireProduct('sll'),
    getFirstSllPublishedTrack('welcome'),
    getFirstSllPublishedTrack('method'),
  ]);
  const firstLessonId =
    welcome?.resumeLessonId ??
    welcome?.stages.flatMap((stage) =>
      stage.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id)),
    )[0];
  const lesson = firstLessonId ? await getSllLessonViewer(firstLessonId) : null;

  return (
    <AreaShell
      account={session.user}
      hasChoice={products.length > 1}
      area="sll"
      title={welcome?.title ?? 'Comece aqui'}
      intro={welcome?.description ?? WELCOME_MESSAGE}
    >
      {lesson && welcome ? (
        <SllLessonViewer
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
    </AreaShell>
  );
}
