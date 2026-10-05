import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { Glob } from 'bun';

/**
 * Guarda do design (docs/DESIGN.md): falha quando alguém (gente ou IA) troca as cores da marca,
 * a fonte ou usa cor solta na interface. A correção é voltar ao padrão; mudar este teste só quando
 * o dono do produto pediu a mudança de design (e o DESIGN.md muda junto).
 */

const GLOBALS = readFileSync('src/app/globals.css', 'utf8');

/** O bloco de um seletor do CSS (":root", ".dark"). */
function block(selector: string): string {
  const start = GLOBALS.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Bloco ${selector} sumiu do globals.css`);
  return GLOBALS.slice(start, GLOBALS.indexOf('\n}', start));
}

function token(css: string, name: string): string | undefined {
  return new RegExp(`--${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim();
}

/** Os arquivos de tela (.tsx) do app, com o texto de cada um. */
const SCREENS = [...new Glob('src/**/*.tsx').scanSync('.')].map((path) => ({
  path: path.replaceAll('\\', '/'),
  text: readFileSync(path, 'utf8'),
}));

/**
 * Onde cor solta é desenho, não interface (cada um com o motivo). Fora daqui, cor só pelos tokens.
 */
const DRAWINGS: Record<string, string> = {
  'src/components/brand/mascot/mascot.tsx': 'o mascote (bochechas)',
  'src/features/brand/logo-studio/components/draft-logo.tsx': 'o rascunho do logo da aluna',
  'src/features/loja-pronta/components/question/option-field.tsx':
    'as amostras da pergunta da cor (e o branco do check em cima delas)',
  'src/features/loja-pronta/components/whatsapp-form.tsx': 'a bandeira do Brasil no +55',
  'src/features/auth/components/password-strength-meter.tsx':
    'a escala de força da senha (vermelho a verde), com contraste conferido nos dois temas',
  'src/components/ui/switch.tsx': 'a bolinha branca do interruptor (igual ao do iOS)',
  'src/features/brand/logo-studio/components/write-own.tsx':
    'o branco do microfone gravando, sobre o vermelho',
};

/** As linhas de um arquivo que batem com `pattern`, como "caminho:linha: trecho". */
function offenders(pattern: RegExp): string[] {
  return SCREENS.filter(({ path }) => !Object.hasOwn(DRAWINGS, path)).flatMap(({ path, text }) =>
    text
      .split('\n')
      .flatMap((line, index) =>
        new RegExp(pattern.source, 'g').test(line) ? [`${path}:${index + 1}: ${line.trim()}`] : [],
      ),
  );
}

describe('tokens da marca (globals.css)', () => {
  test('tema claro: estilo Apple, um azul só', () => {
    const light = block(':root');
    expect({
      background: token(light, 'background'),
      foreground: token(light, 'foreground'),
      card: token(light, 'card'),
      primary: token(light, 'primary'),
      'primary-foreground': token(light, 'primary-foreground'),
      link: token(light, 'link'),
    }).toEqual({
      background: '#f5f5f7',
      foreground: '#1d1d1f',
      card: '#ffffff',
      primary: '#0071e3',
      'primary-foreground': '#ffffff',
      link: '#0066cc',
    });
  });

  test('tema escuro: grafite (não preto), o mesmo azul', () => {
    const dark = block('.dark');
    expect({
      background: token(dark, 'background'),
      card: token(dark, 'card'),
      primary: token(dark, 'primary'),
    }).toEqual({ background: '#1f1f22', card: '#2a2a2e', primary: '#0071e3' });
  });

  test('cartões de 28px, corpo de 17px e a fonte Manrope', () => {
    expect(GLOBALS).toContain('--radius-card: 28px;');
    expect(GLOBALS).toContain('--text-body: 1.0625rem;');
    expect(GLOBALS).toContain('--text-sm: 1rem;');
    expect(GLOBALS).toMatch(/--font-sans:\s*var\(--font-manrope\)/);
  });
});

describe('telas', () => {
  test('fontes do Google: só Manrope (texto) e Inconsolata (código)', () => {
    const fonts = SCREENS.flatMap(({ text }) =>
      [...text.matchAll(/import\s*\{([^}]+)\}\s*from\s*'next\/font\/google'/g)].flatMap((match) =>
        match[1]!.split(',').map((name) => name.trim()),
      ),
    );
    expect(fonts.filter((name) => !['Manrope', 'Inconsolata'].includes(name))).toEqual([]);
  });

  test('sem cores da paleta do Tailwind nem branco/preto: cor só pelos tokens', () => {
    const palette =
      /\b(?:bg|text|border|ring|fill|stroke|outline|decoration|from|via|to|divide|placeholder|caret|accent)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})\b/;
    expect(offenders(palette)).toEqual([]);
  });

  test('sem cor solta (#hex, rgb, [#...]) fora dos desenhos', () => {
    expect(offenders(/#[0-9a-fA-F]{6}\b|-\[(?:#|rgb|hsl|oklch)/)).toEqual([]);
  });

  test('sombra só a dos cartões (shadow-card) ou a leve das peças pequenas (shadow-sm)', () => {
    expect(offenders(/\bshadow-(?:md|lg|xl|2xl)\b/)).toEqual([]);
  });

  test('a lista de desenhos só tem arquivos que existem', () => {
    const paths = new Set(SCREENS.map(({ path }) => path));
    expect(Object.keys(DRAWINGS).filter((path) => !paths.has(path))).toEqual([]);
  });
});
