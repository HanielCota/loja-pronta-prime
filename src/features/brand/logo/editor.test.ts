import { describe, expect, test } from 'bun:test';
import {
  alignElement,
  duplicateElement,
  elementLabel,
  moveLayer,
  nextId,
  record,
  redo,
  rotatedHalfExtents,
  rotationFromPointer,
  scaleElement,
  snapCenter,
  undo,
  withPrimarySize,
} from './editor';
import { logoSceneSchema, type LogoScene, type SceneElement } from './scene';

const still = { rotation: 0, opacity: 1 };
const NAME: SceneElement = {
  id: 'nome',
  type: 'text',
  source: 'name',
  font: 'simples',
  color: '#e85d8e',
  size: 120,
  maxWidth: 700,
  lines: 1,
  align: 'center',
  x: 500,
  y: 600,
  ...still,
};
const ICON: SceneElement = {
  id: 'icone',
  type: 'icon',
  icon: 'pata',
  color: '#e85d8e',
  size: 200,
  x: 500,
  y: 300,
  ...still,
};
const BAND: SceneElement = {
  id: 'faixa',
  type: 'shape',
  shape: 'rect',
  color: '#e85d8e',
  width: 800,
  height: 200,
  radius: 40,
  x: 500,
  y: 600,
  ...still,
};
const SCENE: LogoScene = { version: 2, background: '#ffffff', elements: [BAND, ICON, NAME] };

describe('snapCenter', () => {
  test('perto do meio, encaixa e acende a guia', () => {
    expect(snapCenter(508, 300)).toEqual({
      x: 500,
      y: 300,
      guides: { vertical: true, horizontal: false },
    });
  });

  test('o centro nunca sai da tela', () => {
    expect(snapCenter(-200, 1400)).toMatchObject({ x: 0, y: 1000 });
  });
});

describe('scaleElement e withPrimarySize', () => {
  test('tudo que tem tamanho acompanha, e a cena continua válida', () => {
    expect(scaleElement(BAND, 0.5)).toMatchObject({ width: 400, height: 100, radius: 20 });
    expect(scaleElement(NAME, 2)).toMatchObject({ size: 240, maxWidth: 1400 });
    const huge = scaleElement(ICON, 100);
    expect(logoSceneSchema.safeParse({ ...SCENE, elements: [huge] }).success).toBe(true);
  });

  test('o controle de tamanho muda o principal e o resto na mesma proporção', () => {
    expect(withPrimarySize(BAND, 400)).toMatchObject({ width: 400, height: 100 });
  });
});

describe('rotationFromPointer', () => {
  const center = { x: 500, y: 500 };
  test('em cima é 0; à direita, 90', () => {
    expect(rotationFromPointer(center, { x: 500, y: 100 })).toBe(0);
    expect(rotationFromPointer(center, { x: 900, y: 500 })).toBe(90);
  });

  test('perto de um ângulo reto encaixa; com fine, de 15 em 15', () => {
    expect(rotationFromPointer(center, { x: 520, y: 100 })).toBe(0);
    expect(rotationFromPointer(center, { x: 700, y: 154 })).not.toBe(0);
    expect(rotationFromPointer(center, { x: 700, y: 154 }, true) % 15).toBe(0);
  });
});

describe('alignElement', () => {
  test('encosta na borda contando o tamanho, também girado', () => {
    expect(alignElement(ICON, { width: 200, height: 200 }, 'left').x).toBe(100);
    expect(alignElement(ICON, { width: 200, height: 200 }, 'bottom').y).toBe(900);
    const turned = { ...BAND, rotation: 90 };
    expect(alignElement(turned, { width: 800, height: 200 }, 'left').x).toBe(100);
  });

  test('girado 45°, ocupa mais espaço', () => {
    const half = rotatedHalfExtents({ width: 200, height: 200 }, 45);
    expect(half.width).toBeCloseTo(141.4, 1);
  });
});

describe('camadas e cópias', () => {
  test('pra frente e pra trás, parando nas pontas', () => {
    expect(moveLayer(SCENE, 'faixa', 1).elements.map((e) => e.id)).toEqual([
      'icone',
      'faixa',
      'nome',
    ]);
    expect(moveLayer(SCENE, 'nome', 1)).toBe(SCENE);
  });

  test('duplicar põe a cópia logo à frente, deslocada, com id novo', () => {
    const result = duplicateElement(SCENE, 'icone', 'Bella')!;
    expect(result.scene.elements.map((e) => e.id)).toEqual(['faixa', 'icone', 'e1', 'nome']);
    expect(result.scene.elements[2]).toMatchObject({ x: 530, y: 330 });
  });

  test('a cópia do nome vira texto dela, com o nome escrito', () => {
    const result = duplicateElement(SCENE, 'nome', 'Bella')!;
    expect(result.scene.elements.find((e) => e.id === result.id)).toMatchObject({
      source: 'custom',
      value: 'Bella',
    });
  });

  test('ids novos não repetem', () => {
    const scene = { ...SCENE, elements: [...SCENE.elements, { ...ICON, id: 'e1' }] };
    expect(nextId(scene)).toBe('e2');
  });

  test('nomes pra lista de camadas', () => {
    expect(SCENE.elements.map(elementLabel)).toEqual([
      'Retângulo',
      'Desenho: Pata',
      'Nome da loja',
    ]);
  });
});

describe('histórico', () => {
  test('desfazer e refazer voltam e avançam; mudança nova apaga o refazer', () => {
    const moved = { ...SCENE, background: '#000000' };
    let history = record({ past: [], future: [] }, SCENE);
    const undone = undo(history, moved)!;
    expect(undone.scene).toBe(SCENE);
    const redone = redo(undone.history, undone.scene)!;
    expect(redone.scene).toBe(moved);
    history = record(undone.history, SCENE);
    expect(history.future).toEqual([]);
  });

  test('sem nada pra desfazer ou refazer: nada', () => {
    expect(undo({ past: [], future: [] }, SCENE)).toBeUndefined();
    expect(redo({ past: [], future: [] }, SCENE)).toBeUndefined();
  });
});
