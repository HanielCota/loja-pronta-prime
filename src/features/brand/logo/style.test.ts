import { describe, expect, test } from 'bun:test';
import { logoTemplates } from './config';
import { inkOn } from './palette';
import { elementColor, logoSceneSchema, type LogoScene, type SceneElement } from './scene';
import {
  applyBackground,
  applyColor,
  applyFont,
  applyIcon,
  paletteIdFor,
  removeIcons,
  sceneStyle,
  styleToConfig,
} from './style';

const still = { rotation: 0, opacity: 1 };
const ROSA = inkOn('#e85d8e');
const NAME: SceneElement = {
  id: 'nome',
  type: 'text',
  source: 'name',
  font: 'delicada',
  color: ROSA,
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
  color: ROSA,
  size: 200,
  x: 500,
  y: 300,
  ...still,
};
const SLOGAN: SceneElement = {
  ...NAME,
  id: 'slogan',
  source: 'custom',
  value: 'desde 2020',
  color: '#1d1d1f',
};
const SCENE: LogoScene = { version: 2, background: '#ffffff', elements: [ICON, NAME, SLOGAN] };

describe('sceneStyle', () => {
  test('a cor do nome, a letra dele, o primeiro desenho e o fundo', () => {
    expect(sceneStyle(SCENE)).toEqual({
      color: ROSA,
      font: 'delicada',
      icon: 'pata',
      colored: false,
    });
  });
});

describe('sceneStyle em formatos com o nome branco', () => {
  test('selo: a cor principal é a do círculo, não o branco do nome', () => {
    const seal: SceneElement = {
      id: 'selo',
      type: 'shape',
      shape: 'circle',
      color: ROSA,
      width: 800,
      height: 800,
      x: 500,
      y: 500,
      ...still,
    };
    const scene: LogoScene = {
      version: 2,
      background: '#ffffff',
      elements: [seal, { ...NAME, color: '#ffffff' }],
    };
    expect(sceneStyle(scene).color).toBe(ROSA);
    // Trocar a cor muda o círculo; o nome continua branco.
    const blue = applyColor(scene, '#2f7de1');
    expect(blue.elements.map((e) => elementColor(e))).toEqual([inkOn('#2f7de1'), '#ffffff']);
  });
});

describe('escolhas rápidas', () => {
  test('cor: troca a principal e deixa as outras como ela pôs', () => {
    const result = applyColor(SCENE, '#2f7de1');
    expect(result.elements.map((e) => elementColor(e))).toEqual([
      inkOn('#2f7de1'),
      inkOn('#2f7de1'),
      '#1d1d1f',
    ]);
  });

  test('letra: todos os textos', () => {
    const result = applyFont(SCENE, 'moderna');
    expect(
      result.elements.filter((e) => e.type === 'text').every((e) => e.font === 'moderna'),
    ).toBe(true);
  });

  test('desenho: troca o principal; sem nenhum, põe um', () => {
    expect(applyIcon(SCENE, 'gato').elements[0]).toMatchObject({ icon: 'gato', x: 500, y: 300 });
    const added = applyIcon(removeIcons(SCENE), 'gato');
    expect(added.elements.find((e) => e.type === 'icon')).toMatchObject({ icon: 'gato', y: 260 });
    expect(logoSceneSchema.safeParse(added).success).toBe(true);
  });

  test('fundo colorido e de volta: as cores trocam de lugar e voltam iguais', () => {
    const colored = applyBackground(SCENE, true);
    expect(colored.background).toBe(ROSA);
    expect(elementColor(colored.elements[1]!)).toBe('#ffffff');
    expect(elementColor(colored.elements[2]!)).toBe('#1d1d1f');
    expect(sceneStyle(colored)).toMatchObject({ color: ROSA, colored: true });
    expect(applyBackground(colored, false)).toEqual(SCENE);
  });

  test('com fundo colorido, mudar a cor muda o fundo', () => {
    const result = applyColor(applyBackground(SCENE, true), '#3ba776');
    expect(result.background).toBe(inkOn('#3ba776'));
    expect(elementColor(result.elements[1]!)).toBe('#ffffff');
  });
});

describe('styleToConfig', () => {
  test('o formato escolhido sai com a cor, a letra, o desenho e o fundo de agora', () => {
    const [template] = logoTemplates({ estilo: 'Moderno', cor: 'Azul' });
    const config = styleToConfig(sceneStyle(applyBackground(SCENE, true)), template!);
    expect(config).toMatchObject({
      font: 'delicada',
      color: 'rosa',
      icon: 'pata',
      background: 'cor',
    });
  });

  test('a tinta escurecida ainda acha a cor da paleta', () => {
    expect(paletteIdFor(inkOn('#d9a21b'))).toBe('mostarda');
  });
});
