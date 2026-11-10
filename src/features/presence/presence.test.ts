import { describe, expect, test } from 'bun:test';
import {
  describePresence,
  formatLastSeen,
  isOnline,
  normalizePresencePath,
  HEARTBEAT_MS,
  ONLINE_WINDOW_MS,
  PRESENCE_REFRESH_MS,
} from './presence';

describe('normalizePresencePath', () => {
  test('tira a busca e o fragmento', () => {
    expect(normalizePresencePath('/sll/metodo?aba=1#topo')).toBe('/sll/metodo');
  });

  test('recusa o que não é caminho interno', () => {
    expect(normalizePresencePath('https://site.com/x')).toBeNull();
    expect(normalizePresencePath('//site.com/x')).toBeNull();
    expect(normalizePresencePath('/<script>')).toBeNull();
    expect(normalizePresencePath(`/${'a'.repeat(250)}`)).toBeNull();
    expect(normalizePresencePath(42)).toBeNull();
  });
});

describe('describePresence', () => {
  test('names the independent Zé course and resolves its lesson titles', () => {
    expect(describePresence('/ze-mauro')).toEqual({ area: 'Curso Zé Mauro', page: 'Meu curso' });
    const id = '3f2b7c1e-8a4d-4f6b-9c2e-1a2b3c4d5e6f';
    expect(describePresence(`/ze-mauro/aula/${id}`)).toEqual({
      area: 'Curso Zé Mauro',
      page: 'Assistindo uma aula',
      lessonId: id,
    });
  });
  test('nomeia as páginas do SLL, da Loja Pronta e do perfil', () => {
    expect(describePresence('/sll')).toEqual({ area: 'SLL', page: 'Painel' });
    expect(describePresence('/sll/metodo/etapa/abc')).toEqual({
      area: 'SLL',
      page: 'Uma etapa do Método',
    });
    expect(describePresence('/sll/metodo')).toEqual({ area: 'SLL', page: 'Método' });
    expect(describePresence('/loja-pronta/marca/2')).toEqual({
      area: 'Loja Pronta',
      page: 'Estúdio do logo',
    });
    expect(describePresence('/loja-pronta/marca/pronta')).toEqual({
      area: 'Loja Pronta',
      page: 'Marca pronta',
    });
    expect(describePresence('/perfil')).toEqual({ area: 'Perfil', page: 'Ajustes da conta' });
  });

  test('guarda o id da aula pra mostrar o título', () => {
    const id = '3f2b7c1e-8a4d-4f6b-9c2e-1a2b3c4d5e6f';
    expect(describePresence(`/sll/aula/${id}`)).toEqual({
      area: 'SLL',
      page: 'Assistindo uma aula',
      lessonId: id,
    });
  });

  test('mostra o caminho quando não conhece a página', () => {
    expect(describePresence('/outra')).toEqual({ area: null, page: '/outra' });
  });
});

describe('formatLastSeen e isOnline', () => {
  const now = new Date('2026-10-07T12:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms);

  test('diz há quanto tempo', () => {
    expect(formatLastSeen(ago(20_000), now)).toBe('Agora');
    expect(formatLastSeen(ago(5 * 60_000), now)).toBe('Há 5 min');
    expect(formatLastSeen(ago(3 * 3_600_000), now)).toBe('Há 3 h');
  });

  test('passa de minutos pra horas e de horas pra data nas bordas exatas', () => {
    expect(formatLastSeen(ago(59_499), now)).toBe('Agora');
    expect(formatLastSeen(ago(60_000), now)).toBe('Há 1 min');
    expect(formatLastSeen(ago(3_599_000), now)).toBe('Há 59 min');
    expect(formatLastSeen(ago(3_600_000), now)).toBe('Há 1 h');
    expect(formatLastSeen(ago(24 * 3_600_000 - 1000), now)).toBe('Há 23 h');
    // Um aviso do futuro (relógio adiantado) não vira tempo negativo.
    expect(formatLastSeen(new Date(now.getTime() + 60_000), now)).toBe('Agora');
  });

  test('a data mostra a hora do Brasil, não a do servidor', () => {
    // 01:30 UTC do dia 8 ainda é 22:30 do dia 7 em São Paulo.
    const late = new Date('2026-10-08T01:30:00Z');
    const text = formatLastSeen(late, new Date('2026-10-10T12:00:00Z'));
    expect(text).toContain('07/10/2026');
    expect(text).toContain('22:30');
  });

  test('online só dentro da janela', () => {
    expect(isOnline(ago(ONLINE_WINDOW_MS), now)).toBe(true);
    expect(isOnline(ago(ONLINE_WINDOW_MS + 1), now)).toBe(false);
  });
});

test('pular gravações recentes não tira a aluna da lista de online', () => {
  // Só um aviso em dois é pulado: o seguinte já passa do prazo de regravar.
  expect(PRESENCE_REFRESH_MS).toBeGreaterThan(HEARTBEAT_MS);
  expect(PRESENCE_REFRESH_MS).toBeLessThan(2 * HEARTBEAT_MS);
  // Pior caso: gravou, pulou o próximo, perdeu os dois seguintes e o quarto chega na janela.
  expect(4 * HEARTBEAT_MS).toBeLessThanOrEqual(ONLINE_WINDOW_MS);
});
