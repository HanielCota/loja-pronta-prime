/** Cria um endereço legível e estável a partir do nome escrito no admin. */
export function learningSlugFromTitle(title: string): string {
  return (
    title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80)
      .replace(/-+$/g, '') || 'conteudo'
  );
}

/**
 * Troca o item com o vizinho e devolve a lista inteira já numerada de 0 em diante.
 * Renumerar tudo evita que dois itens com a mesma posição fiquem presos no lugar.
 * Devolve null quando não há vizinho (primeiro subindo, último descendo).
 */
export function swapWithNeighbor(
  ids: string[],
  id: string,
  direction: 'up' | 'down',
): { id: string; position: number }[] | null {
  const index = ids.indexOf(id);
  const targetIndex = index + (direction === 'up' ? -1 : 1);
  if (index < 0 || targetIndex < 0 || targetIndex >= ids.length) return null;
  const next = [...ids];
  [next[index], next[targetIndex]] = [next[targetIndex]!, next[index]!];
  return next.map((item, position) => ({ id: item, position }));
}
