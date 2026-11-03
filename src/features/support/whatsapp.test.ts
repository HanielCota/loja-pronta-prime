import { describe, expect, test } from 'bun:test';
import { SUPPORT_TICKET_TOPICS } from './catalog';
import {
  trackedWhatsappPath,
  WHATSAPP_TOPIC_BY_TICKET_TOPIC,
  whatsappContactFor,
  whatsappContacts,
  whatsappHref,
} from './whatsapp';

const phones = {
  technical: '31999990001',
  ombudsman: '31999990004',
  lessons: '31999990002',
  shipping: '31999990003',
};

describe('WhatsApp junto dos chamados', () => {
  test('todo tema do chamado está no mapa', () => {
    for (const topic of SUPPORT_TICKET_TOPICS) {
      expect(topic in WHATSAPP_TOPIC_BY_TICKET_TOPIC).toBe(true);
    }
  });

  test('liga tema ao assunto sem renomear os ids antigos', () => {
    expect(whatsappContactFor(phones, 'access')?.topic).toBe('technical');
    expect(whatsappContactFor(phones, 'store')?.name).toBe('Mylena');
    expect(whatsappContactFor(phones, 'lessons')?.name).toBe('Dani');
    expect(whatsappContactFor(phones, 'shipping')?.name).toBe('Mylena');
    expect(whatsappContactFor(phones, 'payment')).toBeNull();
  });

  test('sem número não tem link ("Em breve")', () => {
    const unavailable = { ...phones, technical: '', ombudsman: '' };
    expect(whatsappHref(whatsappContactFor(unavailable, 'lessons')!)).toBeNull();
    expect(whatsappHref(whatsappContactFor(unavailable, 'shipping')!)).toBeNull();
  });

  test('uses the new owners instead of retired numbers for existing topic links', () => {
    const lessons = whatsappHref(whatsappContactFor(phones, 'lessons')!);
    const shipping = whatsappHref(whatsappContactFor(phones, 'shipping')!);
    expect(lessons).toContain('wa.me/5531999990004');
    expect(decodeURIComponent(lessons!)).toContain('Oi, Dani!');
    expect(shipping).toContain('wa.me/5531999990001');
    expect(decodeURIComponent(shipping!)).toContain('Oi, Mylena!');
  });

  test.each(['refund', 'reclame-aqui'])('routes %s to Dani’s WhatsApp', (topic) => {
    const contact = whatsappContacts(phones).find((item) => item.topic === topic)!;
    expect(contact.name).toBe('Dani');
    expect(whatsappHref(contact)).toContain('wa.me/5531999990004');
  });

  test('a mensagem é a mesma do Perfil, sem dados da aluna', () => {
    const href = whatsappHref(whatsappContactFor(phones, 'access')!);
    expect(href).toContain('wa.me/5531999990001');
    expect(decodeURIComponent(href!)).toContain(
      'Oi, Mylena! Sou aluna do Escala Shop e preciso de ajuda com: Erros, bugs e acesso.',
    );
  });

  test('o link novo conta o clique e diz de onde veio', () => {
    expect(trackedWhatsappPath('lessons', 'platform')).toBe('/suporte/whatsapp/lessons');
    expect(trackedWhatsappPath('technical', 'login')).toBe(
      '/suporte/whatsapp/technical?origem=login',
    );
  });
});
