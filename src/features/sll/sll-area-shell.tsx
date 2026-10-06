import type { ComponentProps } from 'react';
import type { AreaShell } from '@/features/member/components/area-shell';
import { SllShell } from '@/features/products/components/sll-shell';
import { sllStageLinks } from '@/features/products/sll-navigation';
import { getSllSidebarStages } from './server/catalog';

/** Mantém uma moldura única em todas as páginas do SLL e liga o menu às etapas publicadas. */
export async function SllAreaShell({
  currentSection,
  backLink,
  ...props
}: Omit<ComponentProps<typeof AreaShell>, 'area' | 'sidebar'> & {
  currentSection?: string | undefined;
  backLink?: { href: string; label: string } | undefined;
}) {
  const stages = await getSllSidebarStages();
  const stageLinks = sllStageLinks(stages);

  return (
    <SllShell
      account={props.account}
      hasChoice={props.hasChoice}
      title={props.title}
      description={props.intro}
      productName={props.product ?? 'Sistema Loja Lucrativa (SLL)'}
      beforeHeader={props.beforeHeader}
      header={props.header}
      backLink={backLink}
      stageLinks={stageLinks}
      currentSection={currentSection}
    >
      {props.children}
    </SllShell>
  );
}
