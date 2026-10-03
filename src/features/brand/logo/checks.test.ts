import { describe, expect, test } from 'bun:test';
import type { OnboardingAnswers } from '@/config/onboarding';
import { checkLogo, enlargeName, insideCircle, MIN_LINE_HEIGHT, readableOn } from './checks';
import { IDEA_COUNT, logoIdeas, logoTemplates } from './config';
import { elementSize } from './editor';
import { LOGO_FONT_IDS } from './fonts';
import { loadLogoFonts } from './fonts.server';
import { configToScene } from './from-config';
import { LOGO_COLOR_IDS } from './palette';
import type { LogoScene, SceneElement, TextElement } from './scene';

const ANSWERS: OnboardingAnswers = { estilo: 'Delicado', cor: 'Rosa', categorias: ['Pets'] };
const fonts = await loadLogoFonts();
const measureFor = (name: string) => (element: SceneElement) => elementSize(element, name, fonts);

/** Aplica os consertos, um de cada vez, até não sobrar nenhum (ou três rodadas). */
function fixAll(scene: LogoScene, name: string): LogoScene {
  let current = scene;
  for (let round = 0; round < 3; round++) {
    const issue = checkLogo(current, measureFor(name)).find((item) => item.fix);
    if (!issue?.fix) break;
    current = issue.fix.apply(current);
  }
  return current;
}

describe('checkLogo', () => {
  test('nenhum modelo pronto tem problema, em toda letra, cor e fundo, com nome comum', () => {
    for (const name of ['Bella', 'Bella Flor', 'Ateliê da Bela Flor Ltda'])
      for (const template of logoTemplates(ANSWERS))
        for (const font of LOGO_FONT_IDS)
          for (const color of LOGO_COLOR_IDS)
            for (const background of ['branco', 'cor'] as const) {
              const scene = configToScene({ ...template, font, color, background }, name, fonts);
              expect(checkLogo(scene, measureFor(name))).toEqual([]);
            }
  });

  test('sem o nome: avisa, e o conserto põe ele de volta', () => {
    const scene = configToScene(logoTemplates(ANSWERS)[0]!, 'Bella', fonts);
    const withoutName: LogoScene = {
      ...scene,
      elements: scene.elements.filter((e) => e.type !== 'text'),
    };
    const issue = checkLogo(withoutName, measureFor('Bella'))[0]!;
    expect(issue.id).toBe('sem-nome');
    const fixed = issue.fix!.apply(withoutName);
    expect(fixed.elements.some((e) => e.type === 'text' && e.source === 'name')).toBe(true);
    expect(checkLogo(fixed, measureFor('Bella'))).toEqual([]);
  });

  test('parte cortada pelo círculo: trazer pra dentro resolve', () => {
    const scene = configToScene(logoTemplates(ANSWERS)[0]!, 'Bella', fonts);
    const icon = scene.elements.find((e) => e.type === 'icon')!;
    const pushed = {
      ...scene,
      elements: scene.elements.map((e) => (e.id === icon.id ? { ...e, x: 940, y: 80 } : e)),
    };
    const issues = checkLogo(pushed, measureFor('Bella'));
    expect(issues.map((i) => i.id)).toContain(`fora-${icon.id}`);
    expect(checkLogo(fixAll(pushed, 'Bella'), measureFor('Bella'))).toEqual([]);
  });

  test('pouco contraste: usa a cor que aparece (branco no escuro, preto no claro)', () => {
    expect(readableOn('#1d1d1f')).toBe('#ffffff');
    expect(readableOn('#ffffff')).toBe('#1d1d1f');
    const scene = configToScene(logoTemplates(ANSWERS)[0]!, 'Bella', fonts);
    const pale = {
      ...scene,
      elements: scene.elements.map((e) => ({ ...e, color: '#f4f4f4' }) as SceneElement),
    };
    const issues = checkLogo(pale, measureFor('Bella'));
    expect(issues.filter((i) => i.id.startsWith('contraste-'))).toHaveLength(2);
    expect(issues[0]!.fix!.label).toBe('Usar preto');
    expect(checkLogo(fixAll(pale, 'Bella'), measureFor('Bella'))).toEqual([]);
  });

  test('nome comprido pequeno demais: dividido em linhas, fica legível e dentro do círculo', () => {
    const name = 'Cantinho Encantado da Aluna Mm';
    const scene = configToScene({ ...logoTemplates(ANSWERS)[1]!, font: 'moderna' }, name, fonts);
    const issue = checkLogo(scene, measureFor(name)).find((i) => i.id === 'nome-pequeno')!;
    expect(issue.fix?.label).toBe('Aumentar o nome');
    const fixed = fixAll(scene, name);
    const text = fixed.elements.find(
      (e) => e.type === 'text' && e.source === 'name',
    ) as TextElement;
    const size = measureFor(name)(text);
    expect(size.height / text.lines).toBeGreaterThanOrEqual(MIN_LINE_HEIGHT);
    expect(insideCircle(text, size)).toBe(true);
    expect(enlargeName(text, measureFor(name)).lines).toBeGreaterThan(1);
  });

  test('uma palavra só, comprida demais: só o aviso, sem botão que não resolve', () => {
    const name = 'Supercalifragilisticexpialidoc';
    const scene = configToScene({ ...logoTemplates(ANSWERS)[1]!, font: 'delicada' }, name, fonts);
    const issue = checkLogo(scene, measureFor(name)).find((i) => i.id === 'nome-pequeno')!;
    expect(issue.fix).toBeUndefined();
    expect(issue.message).toContain('nome mais curto');
  });
});

describe('logoIdeas', () => {
  test('18 ideias, todas diferentes, usando os seis formatos e as cores do estilo', () => {
    const ideas = logoIdeas(ANSWERS);
    expect(ideas).toHaveLength(IDEA_COUNT);
    const keys = ideas.map((i) => JSON.stringify({ ...i, template: 0 }));
    expect(new Set(keys).size).toBe(IDEA_COUNT);
    expect(new Set(ideas.slice(0, 6).map((i) => i.layout)).size).toBe(6);
    expect(ideas[0]!.color).toBe('rosa');
    expect(
      ideas.every((i) => ['rosa', 'lilas', 'dourado', 'terracota', 'turquesa'].includes(i.color)),
    ).toBe(true);
  });

  test('as ideias também passam na conferência', () => {
    for (const idea of logoIdeas(ANSWERS)) {
      const scene = configToScene(idea, 'Bella Flor', fonts);
      expect(checkLogo(scene, measureFor('Bella Flor'))).toEqual([]);
    }
  });

  test('sem respostas: ideias mesmo assim', () => {
    expect(logoIdeas({})).toHaveLength(IDEA_COUNT);
  });
});
