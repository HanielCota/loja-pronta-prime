import { describe, expect, test } from 'bun:test';
import { SUPPORT_TICKET_TOPICS } from './catalog';
import {
  trackedWhatsappPath,
  WHATSAPP_TOPIC_BY_TICKET_TOPIC,
  whatsappContactFor,
  whatsappHref,
} from './whatsapp';

const phones = { technical: '31999990001', lessons: '', shipping: '31999990003', ombudsman: '' };

describe('WhatsApp junto dos chamados', () => {
  test('todo tema do chamado está no mapa', () => {
    for (const topic of SUPPORT_TICKET_TOPICS) {
      expect(topic in WHATSAPP_TOPIC_BY_TICKET_TOPIC).toBe(true);
    }
  });

  test('liga tema ao assunto sem renomear os ids antigos', () => {
    expect(whatsappContactFor(phones, 'access')?.topic).toBe('technical');
    expect(whatsappContactFor(phones, 'store')?.name).toBe('Mylena');
    expect(whatsappContactFor(phones, 'lessons')?.name).toBe('Rackel');
    expect(whatsappContactFor(phones, 'payment')).toBeNull();
  });

  test('sem número não tem link ("Em breve")', () => {
    expect(whatsappHref(whatsappContactFor(phones, 'lessons')!)).toBeNull();
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
    expect(trackedWhatsappPath('technical', 'login')).toBe('/suporte/whatsapp/technical?origem=login');
  });
});
