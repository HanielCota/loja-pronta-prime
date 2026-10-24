/**
 * Número inteiro de um campo de formulário. `Number(null)` e `Number('')` dão 0: um campo que
 * faltou virava "primeira posição" ou "primeiro grupo" em silêncio. Aqui, ausente, vazio ou
 * qualquer coisa que não sejam só dígitos devolve `undefined`, para a action recusar.
 */
export function wholeNumberField(value: FormDataEntryValue | null | undefined): number | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!/^\d{1,9}$/.test(text)) return undefined;
  return Number(text);
}
