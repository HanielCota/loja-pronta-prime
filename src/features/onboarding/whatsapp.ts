/** WhatsApp brasileiro com DDD: só os dígitos (10 ou 11), sem o 55 do país. */
export function parseWhatsapp(input: string): string | undefined {
  let digits = input.replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  if (digits.length !== 10 && digits.length !== 11) return undefined;
  if (digits.startsWith('0')) return undefined;
  return digits;
}

/** (11) 98765-4321 */
export function formatWhatsapp(digits: string): string {
  const area = digits.slice(0, 2);
  const rest = digits.slice(2);
  const split = rest.length === 9 ? 5 : 4;
  return `(${area}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}
