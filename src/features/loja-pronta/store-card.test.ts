import { describe, expect, test } from 'bun:test';
import { STORE_PHASES } from '@/config/store-phases';
import { MISSING_LOGO_DETAIL, storeChooserCard } from './store-card';

describe('storeChooserCard', () => {
  test('fase 1: depende dela, com a etapa, o nome e o que acontece', () => {
    const card = storeChooserCard(1);
    expect(card.waitsOnStudent).toBe(true);
    expect(card.status).toEqual({
      caption: 'Etapa 1 de 3',
      label: 'Conte mais sobre você',
      bar: { step: 1, total: 3 },
      detail: STORE_PHASES[0]?.detail,
    });
  });

  test('marca e conta na Shopee: dependem dela; fases ainda fechadas, não', () => {
    expect(storeChooserCard(2).waitsOnStudent).toBe(true);
    expect(storeChooserCard(3).waitsOnStudent).toBe(true);
    expect(storeChooserCard(4).waitsOnStudent).toBe(false);
    expect(storeChooserCard(5).status.caption).toBe('Etapa 3 de 3');
    expect(storeChooserCard(5).status.detail).toBe(STORE_PHASES[4]?.detail);
  });

  test('marca confirmada sem logo: depende dela em qualquer fase, como no painel', () => {
    const card = storeChooserCard(5, { missingLogo: true });
    expect(card.waitsOnStudent).toBe(true);
    expect(card.status.detail).toBe(MISSING_LOGO_DETAIL);
    expect(card.status.caption).toBe('Etapa 3 de 3');
  });
});
