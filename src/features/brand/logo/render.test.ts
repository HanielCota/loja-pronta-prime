import { describe, expect, test } from 'bun:test';
import type { OnboardingAnswers } from '@/config/onboarding';
import { LOGO_LAYOUTS, logoBase, logoTemplates, TEMPLATE_COUNT, type LogoConfig } from './config';
import { LOGO_FONTS } from './fonts';
import { loadLogoFonts } from './fonts.server';
import { contrast, inkOn, LOGO_COLORS } from './palette';
import { renderLogoSvg } from './render';

const ANSWERS: OnboardingAnswers = {
  estilo: 'Delicado',
  cor: 'Rosa',
  categorias: ['Pets', 'Beleza'],
};

describe('logoBase e logoTemplates', () => {
  test('parte da conversa: letra do estilo, cor escolhida e ícone da primeira categoria', () => {
    expect(logoBase(ANSWERS)).toEqual({ font: 'delicada', color: 'rosa', icon: 'pata' });
  });

  test('sem cor (deixou pra depois), sem estilo e sem categoria conhecida: padrões', () => {
    expect(logoBase({ estilo: 'Elegante', cor: 'Escolho depois' }).color).toBe('preto');
    expect(logoBase({})).toEqual({ font: 'simples', color: 'azul', icon: 'coracao' });
  });

  test('6 modelos, um por formato, numerados', () => {
    const templates = logoTemplates(ANSWERS);
    expect(templates).toHaveLength(TEMPLATE_COUNT);
    expect(templates.map((t) => t.template)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(new Set(templates.map((t) => t.layout)).size).toBe(LOGO_LAYOUTS.length);
  });
});

describe('inkOn', () => {
  test('toda cor fica com pelo menos 3:1 contra o branco', () => {
    for (const color of LOGO_COLORS) {
      expect(contrast(inkOn(color.hex), '#ffffff')).toBeGreaterThanOrEqual(3);
    }
  });

  test('cor que já tem contraste não muda', () => {
    expect(inkOn('#1d1d1f')).toBe('#1d1d1f');
  });
});

describe('renderLogoSvg', async () => {
  const fonts = await loadLogoFonts();
  const names = ['Bella', 'Ateliê da Ana Beleza', 'Lar Doce Lar Decorações & Cia', 'Ç'];

  test('todo formato, letra e nome: SVG quadrado, sem número inválido', () => {
    for (const template of logoTemplates(ANSWERS)) {
      for (const font of LOGO_FONTS) {
        for (const name of names) {
          const config: LogoConfig = { ...template, font: font.id };
          const svg = renderLogoSvg(config, name, fonts);
          expect(
            svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"'),
          ).toBe(true);
          expect(svg).not.toMatch(/NaN|Infinity|undefined/);
        }
      }
    }
  });

  test('o nome vira desenho: nada do que ela digitou entra como texto no SVG', () => {
    const [template] = logoTemplates(ANSWERS);
    const svg = renderLogoSvg(template!, '<script>alert(1)</script>', fonts);
    expect(svg).not.toContain('script');
    expect(svg).not.toContain('<text');
  });

  test('fundo colorido: o fundo é a cor (escurecida se precisar) e o nome é branco', () => {
    const config: LogoConfig = {
      ...logoTemplates(ANSWERS)[0]!,
      background: 'cor',
      color: 'mostarda',
    };
    const svg = renderLogoSvg(config, 'Bella', fonts);
    expect(svg).toContain(`fill="${inkOn('#d9a21b')}"`);
    expect(svg).toContain('fill="#ffffff"');
  });
});
