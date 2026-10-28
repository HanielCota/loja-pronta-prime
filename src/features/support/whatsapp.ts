import { whatsappLink } from '@/features/loja-pronta/whatsapp';
import { SUPPORT_TOPICS, type SupportPhones, type SupportTopicId } from './contacts';
import type { SupportTicketTopic } from './catalog';

/**
 * Os assuntos do WhatsApp (`contacts.ts`) e os temas do chamado são coisas diferentes: este mapa
 * liga um ao outro sem renomear nada. Pagamento e "Outra coisa" não têm WhatsApp.
 */
export const WHATSAPP_TOPIC_BY_TICKET_TOPIC: Readonly<Record<SupportTicketTopic, SupportTopicId | null>> = {
  access: 'technical',
  store: 'technical',
  lessons: 'lessons',
  shipping: 'shipping',
  ombudsman: 'ombudsman',
  payment: null,
  other: null,
};

export type WhatsappContact = {
  topic: SupportTopicId;
  title: string;
  name: string;
  /** Vazio: "Em breve", sem link. */
  phone: string;
};

export function whatsappContacts(phones: SupportPhones): WhatsappContact[] {
  return SUPPORT_TOPICS.map((topic) => ({
    topic: topic.id,
    title: topic.title,
    name: topic.name,
    phone: phones[topic.id],
  }));
}

export function whatsappContactFor(
  phones: SupportPhones,
  ticketTopic: string,
): WhatsappContact | null {
  const topic = WHATSAPP_TOPIC_BY_TICKET_TOPIC[ticketTopic as SupportTicketTopic];
  if (!topic) return null;
  return whatsappContacts(phones).find((contact) => contact.topic === topic) ?? null;
}

/** A mesma mensagem pré-preenchida do Perfil: nada da aluna além do assunto. */
export function whatsappMessage(contact: Pick<WhatsappContact, 'name' | 'title'>): string {
  return `Oi, ${contact.name}! Sou aluna do Escala Shop e preciso de ajuda com: ${contact.title}.`;
}

export function whatsappHref(contact: WhatsappContact): string | null {
  if (!contact.phone) return null;
  return whatsappLink(contact.phone, whatsappMessage(contact));
}

export function isWhatsappTopic(value: string): value is SupportTopicId {
  return SUPPORT_TOPICS.some((topic) => topic.id === value);
}

/** O link que conta o clique e redireciona (só nas telas novas). */
export function trackedWhatsappPath(topic: SupportTopicId, source: 'platform' | 'login'): string {
  return `/suporte/whatsapp/${topic}${source === 'login' ? '?origem=login' : ''}`;
}
