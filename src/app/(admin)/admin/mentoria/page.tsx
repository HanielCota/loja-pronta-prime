import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { requireAdmin } from '@/features/admin/server/access';
import { panelCard } from '@/features/member/components/area-shell';
import {
  MENTORSHIP_LESSONS,
  MENTORSHIP_TITLE,
  mentorshipLiveInput,
} from '@/features/sll/mentorship';
import { getMentorshipLessons, getMentorshipLives } from '@/features/sll/server/mentorship';
import {
  removeMentorshipLive,
  saveMentorshipLesson,
  saveMentorshipLive,
} from '@/features/sll/server/mentorship-actions';
import { ConfirmAction } from '@/features/staff/components/confirm-action';

export const metadata: Metadata = { title: MENTORSHIP_TITLE };

type Live = Awaited<ReturnType<typeof getMentorshipLives>>[number];

function LiveForm({ live }: { live?: Live }) {
  const id = live?.id ?? 'new';
  return (
    <div className="flex flex-col gap-3 border-t border-border py-4">
      <form
        action={saveMentorshipLive.bind(null, live?.id ?? null)}
        aria-labelledby={`live-${id}-heading`}
        className="flex flex-col gap-3"
      >
        <h3 id={`live-${id}-heading`} className="text-body font-semibold wrap-anywhere">
          {live?.title ?? 'Agendar live'}
        </h3>
        <FloatingLabelInput
          id={`live-${id}-title`}
          name="title"
          label="Título da live"
          maxLength={120}
          required
          defaultValue={live?.title}
        />
        <FloatingLabelInput
          id={`live-${id}-time`}
          name="startsAt"
          type="datetime-local"
          label="Data e hora (Brasília)"
          required
          defaultValue={live ? mentorshipLiveInput(live.startsAt) : undefined}
        />
        <FloatingLabelInput
          id={`live-${id}-url`}
          name="live"
          type="url"
          label="Link da live no YouTube"
          maxLength={300}
          defaultValue={live?.liveUrl ?? ''}
        />
        <FloatingLabelInput
          id={`live-${id}-recording`}
          name="recording"
          type="url"
          label="Link da gravação no YouTube"
          maxLength={300}
          defaultValue={live?.recordingUrl ?? ''}
        />
        <Button type="submit" size="inline" className="self-start">
          {live ? 'Salvar live' : 'Agendar live'}
        </Button>
      </form>
      {live ? (
        <ConfirmAction
          label="Remover live"
          title="Remover esta live?"
          description="A data e a gravação serão retiradas da mentoria."
          variant="destructive"
        >
          <form
            action={removeMentorshipLive.bind(null, live.id)}
            aria-label={`Remover ${live.title}`}
          >
            <Button type="submit" size="inline" variant="destructive">
              Confirmar remoção
            </Button>
          </form>
        </ConfirmAction>
      ) : null}
    </div>
  );
}

const errors: Record<string, string> = {
  aula: 'Confira o título e use um link de vídeo do YouTube ou do Panda.',
  live: 'Confira o título, a data e o horário de Brasília. Use links de vídeo do YouTube.',
  removida: 'Esta live já foi removida. Atualize a agenda e tente de novo.',
  acesso: 'Seu acesso mudou. Entre novamente para continuar.',
  erro: 'Não foi possível salvar a alteração. Tente novamente.',
};

export default async function AdminMentorshipPage({
  searchParams,
}: {
  searchParams: Promise<{ resultado?: string }>;
}) {
  await requireAdmin('/admin/mentoria');
  const [lessons, lives, { resultado }] = await Promise.all([
    getMentorshipLessons(),
    getMentorshipLives(),
    searchParams,
  ]);
  const error = resultado && Object.hasOwn(errors, resultado) ? errors[resultado] : null;
  return (
    <AdminPage
      title={MENTORSHIP_TITLE}
      intro="Atualize a agenda do mês e publique as aulas e as gravações das lives."
    >
      {resultado === 'salvo' ? (
        <output className="text-body text-progress-text">Mentoria atualizada.</output>
      ) : null}
      {error ? (
        <p role="alert" className="text-body text-destructive">
          {error}
        </p>
      ) : null}
      <section className={panelCard} aria-labelledby="mentorship-lessons-editor">
        <h2 id="mentorship-lessons-editor" className="text-headline font-semibold">
          Aulas gravadas
        </h2>
        <p className="text-sm text-muted-foreground">
          Use links do YouTube ou Panda. Sem link, a aula aparece como “Em breve”.
        </p>
        {MENTORSHIP_LESSONS.map((defaultTitle, slot) => {
          const lesson = lessons.find((entry) => entry.slot === slot);
          return (
            <form
              key={defaultTitle}
              action={saveMentorshipLesson.bind(null, slot)}
              aria-labelledby={`lesson-${slot}-heading`}
              className="flex flex-col gap-3 border-t border-border py-4"
            >
              <h3 id={`lesson-${slot}-heading`} className="text-body font-semibold">
                {defaultTitle}
              </h3>
              <FloatingLabelInput
                id={`lesson-${slot}-title`}
                name="title"
                label="Título da aula"
                maxLength={120}
                required
                defaultValue={lesson?.title ?? defaultTitle}
              />
              <FloatingLabelInput
                id={`lesson-${slot}-video`}
                name="video"
                label="Link do vídeo"
                type="url"
                maxLength={300}
                defaultValue={lesson?.videoUrl ?? ''}
              />
              <Button type="submit" size="inline" className="self-start">
                Salvar aula
              </Button>
            </form>
          );
        })}
      </section>
      <section className={panelCard} aria-labelledby="mentorship-calendar-editor">
        <h2 id="mentorship-calendar-editor" className="text-headline font-semibold">
          Agenda e gravações
        </h2>
        <p className="text-sm text-muted-foreground">
          Cadastre as lives do mês no horário de Brasília. Depois de cada live, salve o link da
          gravação marcada como “Não listado” no YouTube.
        </p>
        <LiveForm />
        {lives.toReversed().map((live) => (
          <LiveForm key={live.id} live={live} />
        ))}
      </section>
    </AdminPage>
  );
}
