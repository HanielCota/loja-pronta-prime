import { describe, expect, test } from 'bun:test';
import { logoTemplates, type LogoConfig } from './config';
import { loadLogoFonts } from './fonts.server';
import { configToScene } from './from-config';
import { logoSceneSchema, MAX_ELEMENTS, type LogoScene, type TextElement } from './scene';
import { renderSceneSvg } from './scene-render';
import { drawText } from './text';

const TEMPLATES = logoTemplates({ estilo: 'Delicado', cor: 'Rosa', categorias: ['Pets'] });
const byLayout = (layout: LogoConfig['layout']) => TEMPLATES.find((t) => t.layout === layout)!;

const NAME: TextElement = {
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
  y: 500,
  rotation: 0,
  opacity: 1,
};

const scene = (elements: unknown[]): unknown => ({ version: 2, background: '#ffffff', elements });

describe('logoSceneSchema', () => {
  test('aceita uma cena válida', () => {
    expect(logoSceneSchema.safeParse(scene([NAME])).success).toBe(true);
  });

  test('recusa o que o editor nunca manda', () => {
    const invalid = [
      scene([{ ...NAME, color: 'red' }]),
      scene([{ ...NAME, color: '#FFFFFF' }]),
      scene([{ ...NAME, x: Number.NaN }]),
      scene([{ ...NAME, x: 99_999 }]),
      scene([{ ...NAME, opacity: 0 }]),
      scene([{ ...NAME, id: '<script>' }]),
      scene([{ ...NAME, font: 'comic-sans' }]),
      scene([{ ...NAME, source: 'custom' }]),
      scene([{ ...NAME, source: 'custom', value: 'x'.repeat(41) }]),
      scene(Array.from({ length: MAX_ELEMENTS + 1 }, () => NAME)),
      { ...(scene([NAME]) as object), version: 1 },
    ];
    for (const value of invalid) expect(logoSceneSchema.safeParse(value).success).toBe(false);
  });
});

describe('configToScene', async () => {
  const fonts = await loadLogoFonts();

  test('cada formato vira os elementos dele, todos válidos e com ids únicos', () => {
    for (const template of TEMPLATES) {
      const result = configToScene(template, 'Ateliê da Ana', fonts);
      expect(logoSceneSchema.safeParse(result).success).toBe(true);
      const ids = result.elements.map((element) => element.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  test('selo: círculo, anel e o texto por cima, na ordem', () => {
    const result = configToScene(byLayout('selo'), 'Bella', fonts);
    expect(result.elements.map((element) => element.id)).toEqual(['selo', 'anel', 'icone', 'nome']);
  });

  test('inicial: a letra segue o nome, não fica gravada', () => {
    const result = configToScene(byLayout('inicial'), 'Bella', fonts);
    const initial = result.elements.find((element) => element.id === 'inicial');
    expect(initial).toMatchObject({ type: 'text', source: 'initial' });
    expect(initial).not.toHaveProperty('value');
  });

  test('fundo colorido: o fundo vira a cor e o resto fica branco', () => {
    const result = configToScene({ ...byLayout('empilhado'), background: 'cor' }, 'Bella', fonts);
    expect(result.background).not.toBe('#ffffff');
    for (const element of result.elements) expect(element).toMatchObject({ color: '#ffffff' });
  });
});

describe('renderSceneSvg', async () => {
  const fonts = await loadLogoFonts();

  test('girar e transparência entram no SVG; sem eles, o SVG fica limpo', () => {
    const plain = renderSceneSvg(scene([NAME]) as LogoScene, 'Bella', fonts);
    expect(plain).not.toContain('rotate(');
    expect(plain).not.toContain('opacity=');
    const turned = renderSceneSvg(
      scene([{ ...NAME, rotation: -15, opacity: 0.5 }]) as LogoScene,
      'Bella',
      fonts,
    );
    expect(turned).toContain('rotate(-15)');
    expect(turned).toContain('opacity="0.5"');
  });

  test('formas e ícones saem sem número inválido', () => {
    const shapes = [
      { id: 'a', type: 'shape', shape: 'circle', color: '#000000', width: 300, height: 200 },
      { id: 'b', type: 'shape', shape: 'ring', color: '#000000', width: 300, height: 300 },
      { id: 'c', type: 'shape', shape: 'rect', color: '#000000', width: 300, height: 100 },
      { id: 'd', type: 'icon', icon: 'gato', color: '#000000', size: 200 },
    ].map((shape) => ({ ...shape, x: 500, y: 500, rotation: 0, opacity: 1 }));
    const svg = renderSceneSvg(scene(shapes) as LogoScene, 'Bella', fonts);
    expect(svg).not.toMatch(/NaN|Infinity|undefined/);
    expect(svg).toContain('<ellipse');
    expect(svg).toContain('<rect x="-150"');
  });

  test('desenho cheio pinta o miolo; os desenhos só do editor também valem', () => {
    const icon = { id: 'a', type: 'icon', icon: 'osso', color: '#123456', size: 200, filled: true };
    const parsed = logoSceneSchema.safeParse(
      scene([{ ...icon, x: 500, y: 500, rotation: 0, opacity: 1 }]),
    );
    expect(parsed.success).toBe(true);
    const svg = renderSceneSvg(parsed.data!, 'Bella', fonts);
    expect(svg).toContain('fill="#123456" stroke="#123456"');
  });

  test('texto dela vira desenho: nada do que ela digitou entra como texto', () => {
    const custom = { ...NAME, id: 'slogan', source: 'custom', value: '<script>alert(1)</script>' };
    const svg = renderSceneSvg(scene([custom]) as LogoScene, 'Bella', fonts);
    expect(svg).not.toContain('script');
    expect(svg).not.toContain('<text');
  });

  test('nome mais comprido do que o de antes: a letra diminui, sem passar da largura', () => {
    const font = fonts.simples;
    const short = drawText(font, 'Bella', NAME);
    const long = drawText(font, 'Lar Doce Lar Decorações e Utilidades', NAME);
    expect(short.size).toBe(120);
    expect(long.size).toBeLessThan(120);
    expect(long.box.x2 - long.box.x1).toBeLessThanOrEqual(NAME.maxWidth + 1);
  });
});
