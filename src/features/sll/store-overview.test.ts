import { describe, expect, test } from 'bun:test';
import { buildSllStoreOverview, failedSllStoreOverview } from './store-overview';

const BASE = {
  storeExists: false,
  onboardingExists: false,
  onboardingCompleted: false,
  brandExists: false,
  brandName: null,
  phase: 1,
};

describe('buildSllStoreOverview', () => {
  test('mantém a montagem da Loja Pronta separada da conexão Shopee', () => {
    const overview = buildSllStoreOverview(
      {
        ...BASE,
        storeExists: true,
        onboardingCompleted: true,
        brandName: 'Casa da Ana',
        phase: 2,
      },
      true,
    );

    expect(overview.assembly).toMatchObject({
      name: 'Casa da Ana',
      phase: 2,
      phaseTitle: 'Sua marca',
    });
    expect(overview.connected).toEqual({
      status: 'unavailable',
      reason: 'integration-preparation',
    });
  });

  test('não mostra registros da Loja Pronta para quem só tem o SLL', () => {
    const overview = buildSllStoreOverview({ ...BASE, storeExists: true }, false);

    expect(overview.assembly).toBeNull();
  });

  test('não trata ausência de integração como nenhuma venda ou loja conectada', () => {
    const overview = buildSllStoreOverview(BASE, true);

    expect(overview.assembly).toBeNull();
    expect(overview.connected.status).toBe('unavailable');
  });

  test('mantém falha de leitura separada do estado vazio', () => {
    const overview = failedSllStoreOverview();

    expect(overview.assembly).toBeNull();
    expect(overview.connected).toEqual({ status: 'failure', reason: 'load-failure' });
  });
});
