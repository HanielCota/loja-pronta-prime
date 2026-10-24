/** Caracteres de controle não pertencem a nomes, identificadores nem endereços digitados. */
export function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

/** Nunca aparecem na tela: zero-width space, word joiner e BOM. */
const INVISIBLE_CHARACTERS = /[\u200B\u2060\uFEFF]/g;
/** Também invisíveis sozinhos, mas o joiner (U+200D) monta emojis como 👩‍💻: só contam para "vazio". */
const INVISIBLE_WHEN_ALONE = /[\u200B-\u200F\u2060\uFEFF]/g;

/**
 * Texto digitado ou colado, como a tela mostra: quebra de linha única (o navegador manda CRLF,
 * mas o contador do campo conta 1), sem caracteres invisíveis, espaço inquebrável como espaço e
 * sem sobra nas pontas. Sem isso, um texto só com um zero-width passa como "preenchido" e vai
 * em branco para a loja.
 */
export function cleanTypedText(value: string): string {
  const cleaned = value
    .replace(/\r\n?/g, '\n')
    .replace(INVISIBLE_CHARACTERS, '')
    .replace(/\u00A0/g, ' ')
    .trim();
  return cleaned.replace(INVISIBLE_WHEN_ALONE, '').trim() ? cleaned : '';
}
