import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { SllPage } from '@/features/sll/sll-area-shell';
import { SllLessonViewer } from '@/features/sll/components/sll-lesson-viewer';
import { getSllLessonViewer } from '@/features/sll/server/lesson-viewer';
import { safeSllReturnHref, sllLessonHref } from '@/features/sll/lesson-navigation';

export const metadata: Metadata = { title: 'Aula do SLL' };

/** Aula publicada do SLL, com acesso validado antes de carregar materiais. */
export default async function SllLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ voltar?: string | string[] }>;
}) {
  const { lessonId } = await params;
  const { voltar } = await searchParams;
  const returnHref = safeSllReturnHref(voltar);
  const data = await getSllLessonViewer(lessonId);
  if (!data) notFound();
  // Links antigos continuam abrindo a mesma aula, agora dentro da trilha de boas-vindas.
  if (data.track.kind === 'welcome') redirect(sllLessonHref('welcome', data.lesson.id));
  const defaultBackLink =
    data.track.kind === 'method'
      ? { href: `/sll/metodo/etapa/${data.stage.id}`, label: 'Voltar às aulas da etapa' }
      : { href: `/sll/cursos/${data.track.slug}`, label: 'Voltar às aulas do curso' };
  const isLibraryReturn = Boolean(returnHref?.includes('#library-lesson-'));

  return (
    <SllPage
      hasChoice={data.hasChoice}
      title={data.track.title}
      // Sem frase genérica embaixo do título: a trilha da aula e o vídeo já dizem onde ela está.
      backLink={
        returnHref
          ? {
              href: returnHref,
              label: isLibraryReturn ? 'Voltar à biblioteca' : 'Voltar ao plano',
            }
          : defaultBackLink
      }
    >
      <SllLessonViewer key={data.lesson.id} data={{ ...data, returnHref }} />
      {/* O chamado já leva a aula junto: a equipe abre direto no que ela estava vendo. */}
      <p className="text-body text-muted-foreground">
        Problema com esta aula?{' '}
        <Link
          href={`/suporte/novo?tema=lessons&aula=${data.lesson.id}`}
          className="inline-flex min-h-11 items-center font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Fale com o suporte
        </Link>
      </p>
    </SllPage>
  );
}
