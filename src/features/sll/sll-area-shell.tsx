import type { ComponentProps } from 'react';
import { AreaShell } from '@/features/member/components/area-shell';
import { SllSidebar } from './sll-sidebar';

/** Acrescenta a navegação do SLL sem alterar a moldura dos outros produtos. */
export function SllAreaShell(props: Omit<ComponentProps<typeof AreaShell>, 'area' | 'sidebar'>) {
  return <AreaShell {...props} area="sll" sidebar={<SllSidebar />} />;
}
