import type { Metadata } from 'next';
import { PRODUCTS } from '@/features/products/catalog';
import { SllArea } from '@/features/products/components/sll-area';
import {
  getFirstSllPublishedTrack,
  getSllPublishedBanners,
  hasSllPublishedTracks,
} from '@/features/sll/server/catalog';
import { requireProduct } from '@/features/products/server/access';
import { getSllCopy } from '@/features/sll/server/copy';
import { sllLessonHref } from '@/features/sll/lesson-navigation';

export const metadata: Metadata = {
  title: PRODUCTS['sll'].title,
};

/** Área do produto: só pra quem tem o produto (os outros voltam pro início). */
export default async function Page() {
  const [{ session, products, firstVisit }, welcome, method, courses, banners, copy] =
    await Promise.all([
      requireProduct('sll'),
      getFirstSllPublishedTrack('welcome'),
      hasSllPublishedTracks('method'),
      hasSllPublishedTracks('complementary_course'),
      getSllPublishedBanners(),
      getSllCopy(),
    ]);
  const welcomeHref = welcome?.resumeLessonId
    ? sllLessonHref('welcome', welcome.resumeLessonId)
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
      banners={banners}
      copy={copy}
    />
  );
}
