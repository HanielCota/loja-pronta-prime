import { cleanWhatsapp, isValidDdd } from '@/features/loja-pronta/whatsapp';

export const SUPPORT_TOPICS = [
  { id: 'technical', title: 'Erros, bugs e acesso', name: 'Mylena' },
  { id: 'lessons', title: 'Dúvidas sobre as aulas', name: 'Rackel' },
  { id: 'shipping', title: 'Dúvidas sobre o Envio Velox', name: 'Nabila' },
  { id: 'ombudsman', title: 'Ouvidoria', name: 'Dani' },
] as const;

export type SupportTopicId = (typeof SUPPORT_TOPICS)[number]['id'];
export type SupportPhones = Record<SupportTopicId, string>;

export function parseSupportPhones(
  form: FormData,
): { ok: true; phones: SupportPhones } | { ok: false; field: SupportTopicId; message: string } {
  const phones = {} as SupportPhones;
  for (const topic of SUPPORT_TOPICS) {
    const raw = form.get(topic.id);
    if (typeof raw !== 'string' || raw.length > 40) {
      return { ok: false, field: topic.id, message: `Confira o WhatsApp de ${topic.name}.` };
    }
    if (!raw.trim()) {
      phones[topic.id] = '';
      continue;
    }
    const { digits } = cleanWhatsapp(raw);
    if (
      !/^[+\d\s().-]+$/.test(raw) ||
      !isValidDdd(digits.slice(0, 2)) ||
      !/^(?:\d{2}9\d{8}|\d{2}[2-5]\d{7})$/.test(digits)
    ) {
      return {
        ok: false,
        field: topic.id,
        message: `Confira o WhatsApp de ${topic.name}. Inclua o DDD ou deixe vazio para mostrar “Em breve”.`,
      };
    }
    phones[topic.id] = digits;
  }
  return { ok: true, phones };
}
