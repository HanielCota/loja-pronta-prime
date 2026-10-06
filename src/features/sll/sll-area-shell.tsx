import type { ComponentProps } from 'react';
import { AreaShell } from '@/features/member/components/area-shell';
import { SllSidebar } from './sll-sidebar';

/**
 * Acrescenta a navegação do SLL sem alterar a moldura dos outros produtos. `currentSection`: o
 * link do menu que representa esta página quando o endereço dela não está no menu (a aula).
 */
export function SllAreaShell({
  currentSection,
  ...props
}: Omit<ComponentProps<typeof AreaShell>, 'area' | 'sidebar'> & {
  currentSection?: string | undefined;
}) {
  return (
    <AreaShell {...props} area="sll" sidebar={<SllSidebar currentSection={currentSection} />} />
  );
}
