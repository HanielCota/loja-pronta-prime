import { cleanTypedText } from '@/lib/text';

type SettingsInput = { token: string; sllCode: string; storeCode: string };
type SettingsParseResult = { ok: true; value: SettingsInput } | { ok: false; message: string };

/** Cada código libera um produto: dois códigos iguais deixariam um acesso sem configuração. */
export function parseHotmartSettings(form: FormData): SettingsParseResult {
  const token = form.get('token');
  const sllCode = form.get('sllCode');
  const storeCode = form.get('storeCode');
  if (typeof token !== 'string' || typeof sllCode !== 'string' || typeof storeCode !== 'string') {
    return { ok: false, message: 'Confira os campos.' };
  }
  // Código colado da Hotmart pode trazer zero-width ou espaço inquebrável: guardado assim, nunca
  // casaria com o ucode do aviso e toda compra ficaria "Produto sem acesso configurado".
  const value = {
    token: token.trim(),
    sllCode: cleanTypedText(sllCode),
    storeCode: cleanTypedText(storeCode),
  };
  if (
    !value.sllCode ||
    !value.storeCode ||
    value.sllCode.length > 150 ||
    value.storeCode.length > 150
  ) {
    return { ok: false, message: 'Informe os códigos dos dois produtos.' };
  }
  if (value.sllCode === value.storeCode) {
    return {
      ok: false,
      message:
        'Use um código diferente para cada produto. Confira os códigos do SLL e da Loja Pronta na Hotmart.',
    };
  }
  if (value.token && (value.token.length < 8 || value.token.length > 500)) {
    return { ok: false, message: 'O token precisa ter entre 8 e 500 caracteres.' };
  }
  return { ok: true, value };
}
