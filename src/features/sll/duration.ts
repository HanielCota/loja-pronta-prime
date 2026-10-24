/**
 * Duração escrita como se fala: "45 min", "1 h", "2 h 47 min". Ninguém lê "167 min" de relance.
 * Sem duração conhecida (zero ou inválida), nada: o cartão não inventa um tempo.
 */
export function formatDuration(minutes: number | null | undefined): string | null {
  if (!minutes || !Number.isFinite(minutes) || minutes <= 0) return null;
  const total = Math.round(minutes);
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!rest) return `${hours} h`;
  return `${hours} h ${rest} min`;
}
