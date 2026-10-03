import { describe, expect, test } from 'bun:test';
import { STORE_PHASES } from '@/config/store-phases';
import { storeChooserCard } from './store-card';

describe('storeChooserCard', () => {
  test('fase 1: depende dela, com a fase, o nome e o que acontece', () => {
    const card = storeChooserCard(1);
    expect(card.waitsOnStudent).toBe(true);
    expect(card.status).toEqual({
      caption: `Fase 1 de ${STORE_PHASES.length}`,
      label: 'Conversa inicial',
      bar: { step: 1, total: STORE_PHASES.length },
      detail: STORE_PHASES[0]?.detail,
    });
  });

  test('fase com a equipe: não depende dela', () => {
    expect(storeChooserCard(2).waitsOnStudent).toBe(false);
    expect(storeChooserCard(7).status.label).toBe('Loja no ar');
  });
});
