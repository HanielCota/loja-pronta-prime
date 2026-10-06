import { describe, expect, test } from 'bun:test';
import {
  sllCurrentStage,
  sllPage,
  sllStageFromPath,
  sllStageLinks,
  type SllStageLink,
} from './sll-navigation';

const stages: SllStageLink[] = [
  { stage: 1, href: '/sll/metodo/etapa/stage-a', label: 'Etapa 1' },
  { stage: 2, href: '/sll/metodo/etapa/stage-b', label: 'Etapa 2' },
  { stage: 3, href: '/sll/metodo/etapa/stage-c', label: 'Etapa 3' },
];

describe('navegação do SLL', () => {
  test('usa os IDs e títulos das etapas publicadas', () => {
    expect(sllStageLinks([{ id: 'abc', title: 'Comece pela loja' }])).toEqual([
      { stage: 1, href: '/sll/metodo/etapa/abc', label: 'Etapa 1 — Comece pela loja' },
    ]);
  });

  test('identifica a etapa pela rota publicada', () => {
    expect(sllStageFromPath('/sll/metodo/etapa/stage-a', stages)).toBe(1);
    expect(sllStageFromPath('/sll/metodo/etapa/stage-b/aula/3', stages)).toBe(2);
    expect(sllStageFromPath('/sll/metodo/etapa/stage-c', stages)).toBe(3);
  });

  test('não presume a etapa em páginas sem esse contexto na URL', () => {
    expect(sllStageFromPath('/sll/aula/assunto', stages)).toBeNull();
    expect(sllStageFromPath('/sll/metodo', stages)).toBeNull();
    expect(sllStageFromPath('/sll', stages)).toBeNull();
  });

  test('usa a etapa da aula quando ela não aparece no endereço', () => {
    expect(sllCurrentStage('/sll/aula/primeira-venda', '/sll/metodo/etapa/stage-c', stages)).toBe(
      3,
    );
    expect(sllCurrentStage('/sll/metodo/etapa/stage-a/aula/2', undefined, stages)).toBe(1);
    expect(sllCurrentStage('/sll/aula/sem-etapa', undefined, stages)).toBeNull();
  });

  test('mapeia só destinos previstos no menu', () => {
    expect(sllPage(['metodo', 'missao', '2'])?.title).toBe('Etapa 2 — Seu plano de 7 dias');
    expect(sllPage(['minhas-lojas'])?.availability).toBe('stores');
    expect(sllPage(['rota-desconhecida'])).toBeNull();
  });
});
