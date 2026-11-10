// Um formatador só: criar Intl.NumberFormat em cada tela repetia o mesmo trabalho e a mesma regra.
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Valor em reais (ex.: 19.9 → "R$ 19,90"). */
export function formatBRL(value: number): string {
  return BRL.format(value);
}

/** Valor guardado em centavos, como o banco faz (ex.: 1990 → "R$ 19,90"). */
export function formatCentsBRL(cents: number): string {
  return BRL.format(cents / 100);
}
