import { purchaseExpiresAt } from './access-term';

export type ManualAccessTerm = { ok: true; expiresAt: Date } | { ok: false; message: string };

/** Date-only administrative terms end at the end of the chosen day in Brasília. */
function localDayEnd(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T23:59:59.999-03:00`);
  if (!Number.isFinite(date.getTime())) return null;
  const local = new Date(date.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return local === value ? date : null;
}

/** Never infer a purchase date from account creation, import or first login. */
export function parseManualAccessTerm(
  data: FormData,
  suffix = '',
  now = new Date(),
  options: { allowExpired?: boolean } = {},
): ManualAccessTerm {
  const mode = data.get(`termMode${suffix}`);
  const date = localDayEnd(data.get(`termDate${suffix}`));
  if (!date || (mode !== 'purchase' && mode !== 'until'))
    return { ok: false, message: 'Escolha o tipo de prazo e informe uma data válida.' };
  if (mode === 'purchase' && date.getTime() - 86_400_000 >= now.getTime())
    return { ok: false, message: 'A data da compra não pode estar no futuro.' };
  const expiresAt = mode === 'purchase' ? purchaseExpiresAt(date) : date;
  if (expiresAt <= now && !options.allowExpired)
    return {
      ok: false,
      message: 'Esse prazo já terminou. Confira a compra antes de liberar o acesso.',
    };
  return { ok: true, expiresAt };
}
