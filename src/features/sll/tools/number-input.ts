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

/** O mínimo para não perder dinheiro é arredondado para cima. */
export function formatRoas(value: number) {
  return (Math.ceil(value * 100) / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}
