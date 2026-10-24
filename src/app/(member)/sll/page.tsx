import type { Metadata } from 'next';
import { PRODUCTS } from '@/features/products/catalog';
import { SllArea } from '@/features/products/components/sll-area';
import {
  getFirstSllPublishedTrack,
  getSllPublishedBanners,
  getSllPublishedResources,
  hasSllPublishedTracks,
} from '@/features/sll/server/catalog';
import { getSllStoreSummary } from '@/features/sll/server/store-overview';
import { resourceHref } from '@/features/sll/tools/catalog';
import { requireProduct } from '@/features/products/server/access';
import { getSllCopy } from '@/features/sll/server/copy';
import { sllLessonHref } from '@/features/sll/lesson-navigation';

export const metadata: Metadata = {
  title: PRODUCTS['sll'].title,
};

/** Área do produto: só pra quem tem o produto (os outros voltam pro início). */
export default async function Page() {
  const { session, products, firstVisit } = await requireProduct('sll');
  const hasLojaPronta = products.includes('loja-pronta');
  const [welcome, method, courses, banners, copy, resources, storeSummary] = await Promise.all([
    getFirstSllPublishedTrack('welcome'),
    hasSllPublishedTracks('method'),
    hasSllPublishedTracks('complementary_course'),
    getSllPublishedBanners(),
    getSllCopy(),
    getSllPublishedResources(),
    getSllStoreSummary(session.user, hasLojaPronta),
  ]);
  const welcomeHref = welcome?.resumeLessonId
    ? sllLessonHref('welcome', welcome.resumeLessonId)
    : null;
  const welcomeProgress = welcome
    ? { completed: welcome.completedCount, total: welcome.totalCount }
    : null;
  const methodHref = method ? '/sll/metodo' : null;
  const coursesHref = courses ? '/sll/cursos' : null;
  return (
    <SllArea
      user={session.user}
      firstVisit={firstVisit}
      hasChoice={products.length > 1}
      welcomeHref={welcomeHref}
      methodHref={methodHref}
      coursesHref={coursesHref}
      welcomeProgress={welcomeProgress}
      storeSummary={storeSummary}
      hasLojaPronta={hasLojaPronta}
      resources={resources.map((resource) => ({
        id: resource.id,
        slug: resource.slug,
        groupKey: resource.groupKey,
        title: resource.title,
        href: resourceHref(resource),
      }))}
      banners={banners}
      copy={copy}
    />
  );
}
