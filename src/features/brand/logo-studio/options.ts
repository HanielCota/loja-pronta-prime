import type { BrandFontId } from '../fonts';

/**
 * O que dá pra escolher em cada tela do estúdio. `prompt`: como a escolha vai pro resumo da
 * imagem (em português, como o resumo). Os desenhos do rascunho (ícones) ficam na tela
 * (components/symbol-icons.tsx); as cores do rascunho, aqui.
 */

export const LOGO_KINDS = {
  desenho: { label: 'Com um desenho', description: 'Um símbolo com o nome junto' },
  nome: { label: 'Só o nome', description: 'O nome escrito numa letra bonita' },
} as const;
export type LogoKindId = keyof typeof LOGO_KINDS;
export const LOGO_KIND_IDS = Object.keys(LOGO_KINDS) as LogoKindId[];

export const LOGO_SYMBOLS = {
  flor: { label: 'Flor', prompt: 'uma flor' },
  coracao: { label: 'Coração', prompt: 'um coração' },
  estrela: { label: 'Estrela', prompt: 'uma estrela' },
  brilho: { label: 'Brilhos', prompt: 'brilhos, estrelinhas cintilantes' },
  folha: { label: 'Folha', prompt: 'uma folha' },
  coroa: { label: 'Coroa', prompt: 'uma coroa' },
  joia: { label: 'Joia', prompt: 'uma joia lapidada' },
  lua: { label: 'Lua', prompt: 'uma lua' },
  casa: { label: 'Casinha', prompt: 'uma casinha' },
  sofa: { label: 'Sofá', prompt: 'um sofá' },
  luminaria: { label: 'Luminária', prompt: 'uma luminária' },
  sacola: { label: 'Sacolinha', prompt: 'uma sacolinha de compras' },
  camiseta: { label: 'Camiseta', prompt: 'uma camiseta' },
  oculos: { label: 'Óculos', prompt: 'um par de óculos' },
  bebe: { label: 'Bebê', prompt: 'um bebê fofo' },
  coelho: { label: 'Coelhinho', prompt: 'um coelhinho' },
  nuvem: { label: 'Nuvem', prompt: 'uma nuvem' },
  patinha: { label: 'Patinha', prompt: 'uma patinha de bicho' },
  osso: { label: 'Ossinho', prompt: 'um ossinho de cachorro' },
  gato: { label: 'Gatinho', prompt: 'um gatinho' },
  cachorro: { label: 'Cachorro', prompt: 'um cachorrinho' },
  chapeu: { label: 'Chapéu de chef', prompt: 'um chapéu de chef de cozinha' },
  panela: { label: 'Panela', prompt: 'uma panela' },
  xicara: { label: 'Xícara', prompt: 'uma xícara' },
  bolo: { label: 'Bolo', prompt: 'uma fatia de bolo' },
  halter: { label: 'Halter', prompt: 'um halter de academia' },
  raio: { label: 'Raio', prompt: 'um raio de energia' },
  batimento: { label: 'Coração batendo', prompt: 'um coração com linha de batimento' },
  broto: { label: 'Brotinho', prompt: 'um brotinho de planta' },
  lapis: { label: 'Lápis', prompt: 'um lápis' },
  caderno: { label: 'Caderno', prompt: 'um caderno' },
  paleta: { label: 'Paleta', prompt: 'uma paleta de pintura' },
  tesoura: { label: 'Tesoura', prompt: 'uma tesoura' },
  celular: { label: 'Celular', prompt: 'um celular' },
  fone: { label: 'Fone', prompt: 'um fone de ouvido' },
  notebook: { label: 'Notebook', prompt: 'um notebook' },
} as const;
export type LogoSymbolId = keyof typeof LOGO_SYMBOLS;
export const LOGO_SYMBOL_IDS = Object.keys(LOGO_SYMBOLS) as LogoSymbolId[];

/** Os desenhos de cada categoria da conversa inicial, do mais forte pro menos. */
const CATEGORY_SYMBOLS: Record<string, readonly LogoSymbolId[]> = {
  'Casa e decoração': ['casa', 'sofa', 'luminaria', 'folha'],
  Beleza: ['flor', 'brilho', 'coracao', 'joia'],
  'Moda e acessórios': ['sacola', 'coroa', 'camiseta', 'oculos'],
  Infantil: ['bebe', 'coelho', 'nuvem', 'estrela'],
  Pets: ['patinha', 'osso', 'gato', 'cachorro'],
  Cozinha: ['chapeu', 'panela', 'xicara', 'bolo'],
  Fitness: ['halter', 'raio', 'batimento', 'broto'],
  Papelaria: ['lapis', 'caderno', 'paleta', 'tesoura'],
  Tecnologia: ['celular', 'fone', 'notebook', 'raio'],
};
/** Os que completam a lista (servem pra qualquer loja). */
const GENERAL_SYMBOLS: readonly LogoSymbolId[] = [
  'flor',
  'coracao',
  'estrela',
  'brilho',
  'coroa',
  'folha',
  'lua',
  'joia',
];
/** Quantos desenhos a tela mostra (duas fileiras de 4). */
export const SYMBOL_CHOICES = 8;

/**
 * Os desenhos pra ela escolher: primeiro os das categorias que ela vai vender (o primeiro de
 * cada, depois o segundo...), completando com os que servem pra qualquer loja.
 */
export function symbolChoices(categories: readonly string[]): LogoSymbolId[] {
  const lists = categories.map((category) => CATEGORY_SYMBOLS[category] ?? []);
  const ordered: LogoSymbolId[] = [];
  for (let index = 0; index < 4; index++) {
    for (const list of lists) {
      const symbol = list[index];
      if (symbol) ordered.push(symbol);
    }
  }
  return [...new Set([...ordered, ...GENERAL_SYMBOLS])].slice(0, SYMBOL_CHOICES);
}

/**
 * As cores (as mesmas da conversa inicial, cada uma com uma cor de acompanhar). `primary`: o
 * desenho e o nome; `accent`: os detalhes; `tint`: o fundo clarinho. `answer`: a cor da conversa
 * que puxa essa.
 */
export const LOGO_PALETTES = {
  rosa: {
    label: 'Rosa e dourado',
    primary: '#D6336C',
    accent: '#C9A227',
    tint: '#FCE8EF',
    prompt: 'rosa com detalhes em dourado',
    answer: 'Rosa',
  },
  lilas: {
    label: 'Lilás e rosa',
    primary: '#7B4FC9',
    accent: '#E58FC8',
    tint: '#F1EAFB',
    prompt: 'lilás com detalhes em rosa',
    answer: 'Lilás',
  },
  azul: {
    label: 'Azul e céu',
    primary: '#1F5FBF',
    accent: '#62B3F0',
    tint: '#E5F0FC',
    prompt: 'azul com detalhes em azul-claro',
    answer: 'Azul',
  },
  verde: {
    label: 'Verde natural',
    primary: '#2F7D5B',
    accent: '#9CC57A',
    tint: '#E7F3EA',
    prompt: 'verde-escuro com detalhes em verde-claro',
    answer: 'Verde',
  },
  terracota: {
    label: 'Terracota e bege',
    primary: '#B4532F',
    accent: '#E3B98F',
    tint: '#F8EDE4',
    prompt: 'terracota com detalhes em bege',
    answer: 'Terracota',
  },
  preto: {
    label: 'Preto e dourado',
    primary: '#1D1D1F',
    accent: '#C9A227',
    tint: '#F5EFDF',
    prompt: 'preto com detalhes em dourado',
    answer: 'Preto',
  },
} as const;
export type LogoPaletteId = keyof typeof LOGO_PALETTES;
export const LOGO_PALETTE_IDS = Object.keys(LOGO_PALETTES) as LogoPaletteId[];

/** As letras: as da marca (a rota marca/fontes serve o arquivo), cada uma com o seu jeito. */
export const LOGO_LETTERINGS = {
  delicada: {
    label: 'Delicada',
    description: 'Escrita à mão',
    prompt: 'letra cursiva delicada, como escrita à mão',
  },
  elegante: {
    label: 'Elegante',
    description: 'Clássica e chique',
    prompt: 'letra serifada elegante e sofisticada',
  },
  moderna: {
    label: 'Moderna',
    description: 'Firme, em maiúsculas',
    prompt: 'letra moderna sem serifa, toda em maiúsculas',
  },
  divertida: {
    label: 'Divertida',
    description: 'Redondinha e alegre',
    prompt: 'letra arredondada, divertida e alegre',
  },
  simples: {
    label: 'Simples',
    description: 'Fácil de ler',
    prompt: 'letra simples e limpa, bem fácil de ler',
  },
  marcante: {
    label: 'Marcante',
    description: 'Grossa e chamativa',
    prompt: 'letra bem grossa e chamativa',
  },
} as const satisfies Record<BrandFontId, unknown>;
export type LogoLetteringId = keyof typeof LOGO_LETTERINGS;
export const LOGO_LETTERING_IDS = Object.keys(LOGO_LETTERINGS) as LogoLetteringId[];

export const LOGO_BACKGROUNDS = {
  branco: { label: 'Branco', description: 'Limpo, combina com tudo' },
  forte: { label: 'Na cor forte', description: 'O nome fica em branco' },
} as const;
export type LogoBackgroundId = keyof typeof LOGO_BACKGROUNDS;
export const LOGO_BACKGROUND_IDS = Object.keys(LOGO_BACKGROUNDS) as LogoBackgroundId[];

export const LOGO_LOOKS = {
  ilustracao: { label: 'Chapado', description: 'Lê bem até pequenininho' },
  realista: { label: 'Com volume', description: 'Brilho e sombra, parece 3D' },
} as const;
export type LogoLookId = keyof typeof LOGO_LOOKS;
export const LOGO_LOOK_IDS = Object.keys(LOGO_LOOKS) as LogoLookId[];
