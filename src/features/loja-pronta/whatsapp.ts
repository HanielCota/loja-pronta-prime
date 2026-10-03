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

/** Link que abre a conversa no WhatsApp, já com a primeira mensagem escrita. */
export function whatsappLink(digits: string, message: string): string {
  return `https://wa.me/55${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * O que ela digitou ou colou, só os números (até 11), sem o que ela não precisa digitar: o 55 do
 * país (só com mais de 11 números: 55 também é DDD) e zeros na frente do DDD. `removed` diz o que
 * saiu, pra tela explicar.
 */
export function typedWhatsapp(input: string): { digits: string; removed?: 'pais' | 'zero' } {
  let digits = input.replace(/\D/g, '');
  let removed: 'pais' | 'zero' | undefined;
  if (digits.length > 11 && digits.startsWith('55')) {
    digits = digits.slice(2);
    removed = 'pais';
  }
  if (digits.startsWith('0')) {
    digits = digits.replace(/^0+/, '');
    removed = 'zero';
  }
  return { digits: digits.slice(0, 11), ...(removed ? { removed } : {}) };
}

/** Formata enquanto ela digita: "(1", "(11) 9876", "(11) 9876-54", "(11) 98765-4321". */
export function formatTypedWhatsapp(digits: string): string {
  if (!digits) return '';
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
 * (sem DDD, telefone fixo, sem o 9) e o "número completo". Só ajuda: quem confere é o servidor.
 */
export function whatsappHint(digits: string, removed?: 'pais' | 'zero'): WhatsappHint {
  const missing = 11 - digits.length;
  const left = `Falta${missing === 1 ? '' : 'm'} ${missing} número${missing === 1 ? '' : 's'}`;
  if (removed === 'zero' && missing > 0) {
    return { tone: 'warning', text: 'Não precisa do 0: comece pelo DDD, como 11.' };
  }
  if (!digits) return { tone: 'info', text: `Exemplo: ${EXAMPLE}` };
  if (digits.length === 9 && digits.startsWith('9')) {
    return { tone: 'warning', text: 'Faltou o DDD: os 2 números da sua cidade, como 11.' };
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
