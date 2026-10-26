/**
 * Onde a próxima varredura da fila começa. Uma página cheia continua depois do último id; uma
 * página incompleta chegou ao fim e volta pro começo. Assim os mesmos itens que falham sempre não
 * ocupam a página inteira pra sempre e quem vem depois também é atendido.
 */
export function nextScanCursor(ids: readonly string[], pageSize: number): string {
  if (ids.length < pageSize) return '';
  return ids.at(-1) ?? '';
}
