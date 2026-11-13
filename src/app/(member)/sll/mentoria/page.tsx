import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { panelCard } from '@/features/member/components/area-shell';
import { requireProduct } from '@/features/products/server/access';
import {
  MENTORSHIP_LESSONS,
  MENTORSHIP_PATH,
  MENTORSHIP_TITLE,
  mentorshipLiveDate,
} from '@/features/sll/mentorship';
import { getMentorshipLessons, getMentorshipSchedule } from '@/features/sll/server/mentorship';
import { SllPage } from '@/features/sll/sll-area-shell';

export const metadata: Metadata = { title: `${MENTORSHIP_TITLE} · SLL` };

function VideoLink({ href, label, title }: { href: string; label: string; title: string }) {
  return (
    <Button asChild variant="soft" size="inline" className="self-start">
      <a href={href} target="_blank" rel="noreferrer">
        {label}
        <ArrowUpRight aria-hidden="true" />
        <span className="sr-only"> · {title} (abre em outra aba)</span>
      </a>
    </Button>
  );
}

export default async function MentorshipPage() {
  const { products } = await requireProduct('sll', MENTORSHIP_PATH);
  const [lessons, { upcoming, recordings }] = await Promise.all([
    getMentorshipLessons(),
    getMentorshipSchedule(),
  ]);

  return (
    <SllPage hasChoice={products.length > 1} title={MENTORSHIP_TITLE}>
      <section className={panelCard} aria-labelledby="mentorship-lessons">
        <h2 id="mentorship-lessons" className="text-headline font-semibold">
          Aulas gravadas
        </h2>
        <ol className="divide-y divide-border">
          {MENTORSHIP_LESSONS.map((defaultTitle, slot) => {
            const lesson = lessons.find((entry) => entry.slot === slot);
            const title = lesson?.title ?? defaultTitle;
            return (
              <li
                key={defaultTitle}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <span className="text-body font-medium wrap-anywhere">{title}</span>
                {lesson?.videoUrl ? (
                  <VideoLink href={lesson.videoUrl} label="Assistir aula" title={title} />
                ) : (
                  <span className="text-sm text-muted-foreground">Em breve</span>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className={panelCard} aria-labelledby="mentorship-calendar">
        <h2 id="mentorship-calendar" className="text-headline font-semibold">
          Calendário das lives
        </h2>
        <p className="text-sm text-muted-foreground">Horário de Brasília</p>
        {upcoming.length ? (
          <ol className="divide-y divide-border">
            {upcoming.map((live) => (
              <li key={live.id} className="flex flex-col gap-2 py-3">
                <h3 className="text-body font-semibold wrap-anywhere">{live.title}</h3>
                <time
                  dateTime={live.startsAt.toISOString()}
                  className="text-sm text-muted-foreground"
                >
                  {mentorshipLiveDate.format(live.startsAt)}
                </time>
                {live.liveUrl ? (
                  <VideoLink href={live.liveUrl} label="Abrir live no YouTube" title={live.title} />
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-body text-muted-foreground">Novas datas em breve.</p>
        )}
      </section>

      <section className={panelCard} aria-labelledby="mentorship-recordings">
        <h2 id="mentorship-recordings" className="text-headline font-semibold">
          Gravações das lives
        </h2>
        {recordings.length ? (
          <ol className="divide-y divide-border">
            {recordings.map((live) => (
              <li key={live.id} className="flex flex-col gap-2 py-3">
                <h3 className="text-body font-semibold wrap-anywhere">{live.title}</h3>
                <time
                  dateTime={live.startsAt.toISOString()}
                  className="text-sm text-muted-foreground"
                >
                  {mentorshipLiveDate.format(live.startsAt)}
                </time>
                {live.recordingUrl ? (
                  <VideoLink
                    href={live.recordingUrl}
                    label="Ver gravação no YouTube"
                    title={live.title}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Gravação em breve.</p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-body text-muted-foreground">Gravações em breve.</p>
        )}
      </section>
    </SllPage>
  );
}
