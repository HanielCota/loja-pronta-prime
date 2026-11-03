import { cleanWhatsapp, isValidDdd } from '@/features/loja-pronta/whatsapp';

export const SUPPORT_CONTACTS = [
  { id: 'technical', title: 'Dúvidas sobre acesso, erros e Envio Velox', name: 'Mylena' },
  {
    id: 'ombudsman',
    title: 'Dúvidas sobre aulas, ouvidoria, reembolso e Reclame Aqui',
    name: 'Dani',
  },
] as const;

export const SUPPORT_TOPICS = [
  { id: 'technical', title: 'Erros, bugs e acesso', name: 'Mylena', contactId: 'technical' },
  { id: 'lessons', title: 'Dúvidas sobre as aulas', name: 'Dani', contactId: 'ombudsman' },
  { id: 'shipping', title: 'Dúvidas sobre o Envio Velox', name: 'Mylena', contactId: 'technical' },
  { id: 'ombudsman', title: 'Ouvidoria', name: 'Dani', contactId: 'ombudsman' },
  { id: 'refund', title: 'Reembolso', name: 'Dani', contactId: 'ombudsman' },
  { id: 'reclame-aqui', title: 'Reclame Aqui', name: 'Dani', contactId: 'ombudsman' },
] as const;

export type SupportTopicId = (typeof SUPPORT_TOPICS)[number]['id'];
export type SupportContactId = (typeof SUPPORT_CONTACTS)[number]['id'];
export type SupportPhones = Record<SupportContactId, string>;

export function parseSupportPhones(
  form: FormData,
): { ok: true; phones: SupportPhones } | { ok: false; field: SupportContactId; message: string } {
  const phones = {} as SupportPhones;
  for (const topic of SUPPORT_CONTACTS) {
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
