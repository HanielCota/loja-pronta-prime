import { DATABASE_CACHE_SCOPE } from '@/server/cache-context';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { learningTrackKind } from '@/server/db/schema';
import { requireProduct } from '@/features/products/server/access';
import { db } from '@/server/db';
import {
  learningStages,
  learningTracks,
  learningBanners,
  learningResources,
} from '@/server/db/schema';
import { getSllTrackProgress } from './progress';
import { isSafeContentDestination } from '@/lib/urls';
import { isProgressId } from '../progress-rules';
import { SLL_CONTENT_SECONDS, SLL_CONTENT_TAG } from './content-cache';

export type SllTrackKind = (typeof learningTrackKind.enumValues)[number];
const cacheOptions = { revalidate: SLL_CONTENT_SECONDS, tags: [SLL_CONTENT_TAG] };

// Índice pequeno: a inicial precisa saber quais áreas existem, sem carregar aulas ou progresso.
const readTrackIndex = cache(
  unstable_cache(
    async (kind?: SllTrackKind) =>
      db.query.learningTracks.findMany({
        columns: { id: true, slug: true },
        where: and(
          eq(learningTracks.status, 'published'),
          isNull(learningTracks.archivedAt),
          kind ? eq(learningTracks.kind, kind) : undefined,
        ),
        orderBy: [asc(learningTracks.position), asc(learningTracks.id)],
      }),
    ['sll-track-index', DATABASE_CACHE_SCOPE],
    cacheOptions,
  ),
);

/** A permissão é conferida em cada visita, inclusive quando o conteúdo já está em cache. */
export async function hasSllPublishedTracks(kind: SllTrackKind) {
  await requireProduct('sll');
  return (await readTrackIndex(kind)).length > 0;
}

/** Carrega trilhas publicadas pela ordem do painel e anexa o progresso da aluna. */
export async function getSllPublishedTracks(kind?: SllTrackKind) {
  await requireProduct('sll');
  const tracks = await readTrackIndex(kind);
  const loaded = await Promise.all(tracks.map(({ id }) => getSllTrackProgress(id)));
  return loaded.filter((track) => track !== null);
}

export async function getFirstSllPublishedTrack(kind: SllTrackKind) {
  await requireProduct('sll');
  const track = (await readTrackIndex(kind))[0];
  return track ? getSllTrackProgress(track.id) : null;
}

/** Abrir um curso não precisa carregar as aulas e o progresso de todos os outros. */
export async function getSllPublishedCourse(slug: string) {
  await requireProduct('sll');
  const course = (await readTrackIndex('complementary_course')).find(
    (track) => track.slug === slug,
  );
  return course ? getSllTrackProgress(course.id) : null;
}

const readStageTrack = unstable_cache(
  async (stageId: string) =>
    db.query.learningStages.findFirst({
      columns: { trackId: true },
      where: and(
        eq(learningStages.id, stageId),
        eq(learningStages.status, 'published'),
        isNull(learningStages.archivedAt),
      ),
      with: { track: { columns: { kind: true, status: true, archivedAt: true } } },
    }),
  ['sll-stage-track', DATABASE_CACHE_SCOPE],
  cacheOptions,
);

/** Uma URL de etapa carrega somente a trilha que contém aquela etapa publicada. */
export async function getSllMethodTrackForStage(stageId: string) {
  await requireProduct('sll');
  if (!isProgressId(stageId)) return null;
  const stage = await readStageTrack(stageId);
  if (
    !stage ||
    stage.track.kind !== 'method' ||
    stage.track.status !== 'published' ||
    stage.track.archivedAt !== null
  )
    return null;
  return getSllTrackProgress(stage.trackId);
}

const readSidebarStages = unstable_cache(
  async (trackId: string) =>
    db.query.learningStages.findMany({
      columns: { id: true, title: true },
      where: and(
        eq(learningStages.trackId, trackId),
        eq(learningStages.status, 'published'),
        isNull(learningStages.archivedAt),
      ),
      orderBy: [asc(learningStages.position), asc(learningStages.id)],
    }),
  ['sll-sidebar-stages', DATABASE_CACHE_SCOPE],
  cacheOptions,
);

/** O menu reutiliza títulos publicados entre visitas, sem guardar sessão ou desbloqueios. */
export const getSllSidebarStages = cache(async () => {
  await requireProduct('sll');
  const track = (await readTrackIndex('method'))[0];
  return track ? readSidebarStages(track.id) : [];
});

const readBanners = unstable_cache(
  async () => {
    const banners = await db.query.learningBanners.findMany({
      columns: {
        id: true,
        label: true,
        title: true,
        description: true,
        buttonLabel: true,
        destination: true,
        imageAlt: true,
      },
      where: and(eq(learningBanners.status, 'published'), isNull(learningBanners.archivedAt)),
      orderBy: [asc(learningBanners.position), asc(learningBanners.id)],
    });
    return banners.filter((banner) => isSafeContentDestination(banner.destination));
  },
  ['sll-published-banners', DATABASE_CACHE_SCOPE],
  cacheOptions,
);

/** Banners só entram no carrossel quando a imagem e o texto já foram publicados. */
export async function getSllPublishedBanners() {
  await requireProduct('sll');
  return readBanners();
}

const readResources = unstable_cache(
  async () => {
    const resources = await db.query.learningResources.findMany({
      columns: {
        id: true,
        slug: true,
        groupKey: true,
        groupTitle: true,
        title: true,
        description: true,
        buttonLabel: true,
        destination: true,
      },
      where: and(eq(learningResources.status, 'published'), isNull(learningResources.archivedAt)),
      orderBy: [
        asc(learningResources.groupKey),
        asc(learningResources.position),
        asc(learningResources.id),
      ],
    });
    return resources.map((resource) => ({
      ...resource,
      destination:
        resource.destination && isSafeContentDestination(resource.destination)
          ? resource.destination
          : null,
    }));
  },
  ['sll-published-resources', DATABASE_CACHE_SCOPE],
  cacheOptions,
);

export async function getSllPublishedResources() {
  await requireProduct('sll');
  return readResources();
}
