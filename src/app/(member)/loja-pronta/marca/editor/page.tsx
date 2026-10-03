import { redirect } from 'next/navigation';
import { brandStepPath } from '@/features/brand/steps';
import { getParam, type SearchParams } from '@/lib/search-params';

/**
 * Endereço antigo do editor livre: agora ele é o próprio passo do logo. Leva pra lá, mantendo o
 * "vindo da revisão" (links salvos e o histórico do navegador continuam funcionando).
 */
export default async function LogoEditorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const editing = getParam((await searchParams).editar) === '1';
  redirect(`${brandStepPath('ajustar')}${editing ? '?editar=1' : ''}`);
}
