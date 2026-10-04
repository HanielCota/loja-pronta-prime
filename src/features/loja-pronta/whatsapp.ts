/**
 * DDDs que existem no Brasil (plano de numeração da Anatel). "10", "20", "23"... não existem: um
 * número com eles é engano de digitação.
 */
// Uma linha por região (o primeiro número do DDD).
// prettier-ignore
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

export function isValidDdd(ddd: string): boolean {
  return DDDS.has(Number(ddd));
}

type Removed = 'pais' | 'zero' | 'operadora';

/**
 * O 55 da frente é o do país? 55 também é DDD (RS), então nem sempre:
 * - 13 números: é o país (DDD 55 com 2 números a mais é raro demais);
 * - 12 números: é o país quando ela escreveu o "+", ou quando o 3º número não é 9 (um celular
 *   de DDD 55 seria "55 9..."). Sem isso, quem é do RS e aperta uma tecla a mais teria o 55
 *   cortado calado, e o número viraria outro.
 */
function startsWithCountryCode(input: string, digits: string): boolean {
  if (!digits.startsWith('55')) return false;
  if (digits.length === 13) return true;
  if (digits.length !== 12) return false;
  return input.trimStart().startsWith('+') || digits.charAt(2) !== '9';
}

/**
 * Só os números, sem o que ela não precisa digitar:
 * - o 55 do país (veja `startsWithCountryCode`);
 * - o 0 da frente e, depois dele, o código da operadora ("0 21 11 98765-4321": 0 + operadora
 *   21 + DDD), reconhecido quando sobram 12 ou 13 números.
 * Nada é cortado além disso: número a mais continua lá, pra ela ver e corrigir (cortar calado
 * salvaria um número errado como se estivesse certo).
 */
export function cleanWhatsapp(input: string): { digits: string; removed?: Removed } {
  let digits = input.replace(/\D/g, '');
  let removed: Removed | undefined;
  if (startsWithCountryCode(input, digits)) {
    digits = digits.slice(2);
    removed = 'pais';
  }
  if (digits.startsWith('0')) {
    digits = digits.replace(/^0+/, '');
    removed = 'zero';
    if (digits.length === 12 || digits.length === 13) {
      digits = digits.slice(2);
      removed = 'operadora';
    }
  }
  return { digits, ...(removed ? { removed } : {}) };
}

/**
 * WhatsApp brasileiro com DDD: só os dígitos (11), sem o 55 do país: celular, com o 9 depois de
 * um DDD que existe. Telefone fixo não vale: a tela já pede o número do WhatsApp (fixo com
 * WhatsApp é raro, e aceitar seria contrariar o aviso que ela acabou de ler).
 */
export function parseWhatsapp(input: string): string | undefined {
  const { digits } = cleanWhatsapp(input);
  if (!isValidDdd(digits.slice(0, 2))) return undefined;
  return digits.length === 11 && digits.charAt(2) === '9' ? digits : undefined;
}

/** (11) 98765-4321 */
export function formatWhatsapp(digits: string): string {
  const area = digits.slice(0, 2);
  const rest = digits.slice(2);
  const split = rest.length === 9 ? 5 : 4;
  return `(${area}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

/** Link que abre a conversa no WhatsApp, já com a primeira mensagem escrita. */
export function whatsappLink(digits: string, message: string): string {
  return `https://wa.me/55${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Formata enquanto ela digita: "(1", "(11) 9876", "(11) 9876-54", "(11) 98765-4321". Com mais de
 * 11 números, mostra os números soltos: formatado, pareceria um número certo.
 */
export function formatTypedWhatsapp(digits: string): string {
  if (!digits) return '';
  if (digits.length > 11) return digits;
  if (digits.length <= 2) return `(${digits}`;
  const area = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return `(${area}) ${rest}`;
  const split = rest.length === 9 ? 5 : 4;
  return `(${area}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

/**
 * Número de exemplo nas telas: o formato, com X no lugar dos números, pra nunca ser o número de
 * alguém de verdade (um exemplo discável poderia cair num telefone real).
 */
export const WHATSAPP_EXAMPLE = '(11) 9XXXX-XXXX';
const EXAMPLE = WHATSAPP_EXAMPLE;

export type WhatsappHint = { tone: 'info' | 'warning' | 'ok'; text: string };

/**
 * A dica embaixo do campo, enquanto ela digita: o exemplo e quanto falta, os enganos mais comuns
 * (número a mais, DDD que não existe, sem DDD, sem o 9, telefone fixo, com 0) e o "número
 * completo", que só aparece quando o servidor também aceitaria. Quem confere é o servidor.
 */
export function whatsappHint(digits: string, removed?: Removed): WhatsappHint {
  const missing = 11 - digits.length;
  const left = `Falta${missing === 1 ? '' : 'm'} ${missing} número${missing === 1 ? '' : 's'}`;
  if (digits.length > 11) {
    return { tone: 'warning', text: 'Tem número a mais. Confira e apague o que sobrou.' };
  }
  if (removed === 'zero' && missing > 0) {
    return { tone: 'warning', text: 'Não precisa do 0: comece pelo DDD, como 11.' };
  }
  if (!digits) return { tone: 'info', text: `Exemplo: ${EXAMPLE}` };
  // Um celular sem DDD ("9 8765-4321"). Com DDD 91–99 ela também passa por 9 números, mas aí o
  // 3º é o 9 do celular: só avisa quando não pode ser isso.
  if (
    digits.length === 9 &&
    digits.startsWith('9') &&
    (!isValidDdd(digits.slice(0, 2)) || digits.charAt(2) !== '9')
  ) {
    return { tone: 'warning', text: 'Faltou o DDD: os 2 números da sua cidade, como 11.' };
  }
  if (digits.length >= 2 && !isValidDdd(digits.slice(0, 2))) {
    return {
      tone: 'warning',
      text: `O DDD ${digits.slice(0, 2)} não existe. Confira os 2 primeiros números.`,
    };
  }
  if (digits.length === 10 && '2345'.includes(digits.charAt(2))) {
    return {
      tone: 'warning',
      text: 'Esse parece um telefone fixo. Use o número do seu WhatsApp.',
    };
  }
  if (missing > 0) return { tone: 'info', text: `Exemplo: ${EXAMPLE} · ${left}` };
  if (digits.charAt(2) !== '9') {
    return { tone: 'warning', text: 'Confira: no celular, o número começa com 9 depois do DDD.' };
  }
  return { tone: 'ok', text: 'Número completo' };
}
