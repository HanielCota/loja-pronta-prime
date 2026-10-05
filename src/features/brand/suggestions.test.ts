import { describe, expect, test } from 'bun:test';
import { BRAND_DESCRIPTION_MAX, BRAND_NAME_MAX } from '@/config/brand';
import { fontForStyle } from './fonts';
import { descriptionTones, joinList, nameSuggestions } from './suggestions';

describe('joinList', () => {
  test('junta com vírgula e "e"', () => {
    expect(joinList([])).toBe('');
    expect(joinList(['a'])).toBe('a');
    expect(joinList(['a', 'b'])).toBe('a e b');
    expect(joinList(['a', 'b', 'c'])).toBe('a, b e c');
  });
});

describe('nameSuggestions', () => {
  test('6 nomes diferentes, com as palavras da categoria e o nome dela', () => {
    const names = nameSuggestions({ categorias: ['Pets'], estilo: 'Delicado' }, 'Ana Souza');
    expect(names).toHaveLength(6);
    expect(new Set(names).size).toBe(6);
    expect(names[0]).toBe('Pet da Ana');
    expect(names).toContain('Doce Pet');
  });

  test('sem categoria, estilo nem nome: ainda sugere, dentro do limite', () => {
    const names = nameSuggestions({}, '');
    expect(names.length).toBeGreaterThan(0);
    for (const name of nameSuggestions({ categorias: ['Casa e decoração'] }, 'Maria Aparecida')) {
      expect(name.length).toBeLessThanOrEqual(BRAND_NAME_MAX);
    }
  });

  test('mais ideias pro "Outras ideias", sem repetir nem palavra dobrada', () => {
    const names = nameSuggestions(
      { categorias: ['Casa e decoração'], estilo: 'Moderno' },
      'Ana',
      18,
    );
    expect(names.length).toBeGreaterThan(12);
    expect(new Set(names).size).toBe(names.length);
    expect(names.slice(0, 6)).toEqual(
      nameSuggestions({ categorias: ['Casa e decoração'], estilo: 'Moderno' }, 'Ana'),
    );
    for (const name of names) {
      const words = name
        .toLowerCase()
        .split(/[\s&]+/)
        .filter(Boolean);
      expect(new Set(words).size).toBe(words.length);
    }
  });

  test('mesmas respostas, mesmas sugestões', () => {
    const answers = { categorias: ['Beleza', 'Fitness'], estilo: 'Moderno' };
    expect(nameSuggestions(answers, 'Ana')).toEqual(nameSuggestions(answers, 'Ana'));
  });
});

describe('descriptionTones', () => {
  test('3 jeitos de falar, 3 textos cada, com o nome da loja, as categorias e o sentimento', () => {
    const tones = descriptionTones(
      { categorias: ['Pets', 'Beleza'], sentimento: ['Acolhimento', 'Sofisticação'] },
      'Pet da Ana',
    );
    expect(tones.map((tone) => tone.label)).toEqual(['Carinhoso', 'Direto', 'Animado']);
    const texts = tones.flatMap((tone) => tone.texts);
    expect(texts).toHaveLength(9);
    expect(new Set(texts).size).toBe(9);
    expect(texts[0]).toContain('Na loja Pet da Ana');
    expect(texts[0]).toContain('produtos de pets e beleza');
    expect(texts[0]).toContain('acolhida e especial');
    for (const text of texts) {
      expect(text).toContain('Pet da Ana');
      expect(text.length).toBeLessThanOrEqual(BRAND_DESCRIPTION_MAX);
    }
  });

  test('categoria com "e" no nome não deixa a lista confusa', () => {
    const [tone] = descriptionTones(
      { categorias: ['Beleza', 'Casa e decoração', 'Moda e acessórios'] },
      'Bella',
    );
    expect(tone!.texts[0]).toContain('produtos de beleza, decoração e moda');
  });

  test('sem respostas: frases gerais, sem buraco', () => {
    for (const text of descriptionTones({}, 'Loja').flatMap((tone) => tone.texts)) {
      expect(text).not.toMatch(/undefined|de \.|  /);
    }
  });
});

describe('fontForStyle', () => {
  test('cada estilo da conversa puxa uma letra; sem estilo, a simples', () => {
    expect(fontForStyle('Delicado')).toBe('delicada');
    expect(fontForStyle('Artesanal')).toBe('delicada');
    expect(fontForStyle('Profissional')).toBe('simples');
    expect(fontForStyle(undefined)).toBe('simples');
    expect(fontForStyle('Inventado')).toBe('simples');
  });
});

describe('sensações e "Outros" nos textos', () => {
  test('a sensação vira como a cliente se sente; "Outros" não aparece na frase', () => {
    const [carinhoso] = descriptionTones(
      { categorias: ['Outros'], sentimento: ['Confiança'] },
      'Loja X',
    );
    expect(carinhoso?.texts[0]).toContain('você encontra produtos escolhidos');
    expect(carinhoso?.texts[0]).toContain('se sentir segura');
  });
});
