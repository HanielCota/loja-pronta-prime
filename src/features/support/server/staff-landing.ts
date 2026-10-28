import { getStudentProducts } from '@/features/products/server/access';
import { staffPanelLinkOf } from '../staff-access';

/**
 * Pra onde a equipe vai depois de entrar, quando ela não pediu destino nenhum: o painel do cargo.
 * Só vale pra quem não comprou nenhum produto, porque o início mostraria "Seu acesso ainda não foi
 * liberado" — recado pra aluna, não pra quem trabalha aqui. Quem é da equipe e também é aluna
 * continua entrando pela área dela, com o atalho do painel no menu da conta.
 */
export async function staffLandingPath(user: {
  id: string;
  role?: string | null | undefined;
}): Promise<string | null> {
  const panel = staffPanelLinkOf(user.role);
  if (!panel) return null;
  const { products } = await getStudentProducts(user.id);
  if (products.length > 0) return null;
  return panel.href;
}
