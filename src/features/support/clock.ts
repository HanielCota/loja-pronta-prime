/**
 * A hora da leitura, num lugar só: páginas do servidor leem o relógio uma vez por renderização e
 * passam adiante (prazos, "fora do horário"), em vez de chamar `new Date()` no meio do desenho.
 */
export function readClock(): Date {
  return new Date();
}
