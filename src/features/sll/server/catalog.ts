import { and, asc, eq, isNull } from 'drizzle-orm';
import type { learningTrackKind } from '@/server/db/schema';
import { requireProduct } from '@/features/products/server/access';
import { db } from '@/server/db';
import { learningTracks } from '@/server/db/schema';
import { learningBanners, learningResources } from '@/server/db/schema';
import { getSllTrackProgress } from './progress';

export type SllTrackKind = (typeof learningTrackKind.enumValues)[number];

/** Carrega trilhas publicadas pela ordem do painel e anexa o progresso da aluna. */
export async function getSllPublishedTracks(kind?: SllTrackKind) {
  await requireProduct('sll');
  const tracks = await db.query.learningTracks.findMany({
    columns: { id: true },
    where: and(
      eq(learningTracks.status, 'published'),
      isNull(learningTracks.archivedAt),
      kind ? eq(learningTracks.kind, kind) : undefined,
    ),
    orderBy: [asc(learningTracks.position), asc(learningTracks.id)],
  });

  const loaded = await Promise.all(tracks.map(({ id }) => getSllTrackProgress(id)));
  return loaded.filter((track) => track !== null);
}

export async function getFirstSllPublishedTrack(kind: SllTrackKind) {
  return (await getSllPublishedTracks(kind))[0] ?? null;
}

/** Banners só entram no carrossel quando a imagem e o texto já foram publicados. */
export async function getSllPublishedBanners() {
  await requireProduct('sll');
  return db.query.learningBanners.findMany({
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
}

export async function getSllPublishedResources() {
  await requireProduct('sll');
  return db.query.learningResources.findMany({
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
}
