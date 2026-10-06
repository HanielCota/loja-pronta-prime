import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireProduct } from '@/features/products/server/access';
import { SllUnavailablePage } from '@/features/products/components/sll-shell';
import { sllPage, sllStageLinks } from '@/features/products/sll-navigation';
import { getSllSidebarStages } from '@/features/sll/server/catalog';

type PageProps = { params: Promise<{ section: string[] }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { section } = await params;
  const page = sllPage(section);
  return { title: page?.title ?? 'SLL' };
}

/** As páginas do SLL seguem protegidas mesmo enquanto o conteúdo ainda está sendo preparado. */
export default async function SllSectionPage({ params }: PageProps) {
  const { section } = await params;
  const path = `/sll/${section.join('/')}`;
  const { session, products } = await requireProduct('sll', path);
  const page = sllPage(section);
  if (!page) notFound();

  const stages = sllStageLinks(await getSllSidebarStages());
  return (
    <SllUnavailablePage
      account={session.user}
      hasChoice={products.length > 1}
      page={page}
      stageLinks={stages}
    />
  );
}
