/** Aceita o decimal brasileiro e o ponto do teclado numérico; nunca transforma vazio em zero. */
export function parseDecimalInput(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.replace(',', '.').split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(result) ? result : null;
}

export function formatMoney(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

/** Só formata: o ROAS já chega arredondado pra cima no centésimo (ver roasRoundedUp). */
export function formatRoas(value: number) {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}
