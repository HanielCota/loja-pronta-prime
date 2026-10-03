import { EDITOR_ONLY_ICON_LIST, LOGO_ICON_LIST } from './icon-list';
import { ICON_PATHS } from './icon-paths';

/**
 * Os desenhos do logo, do Phosphor Icons (licença MIT): caminhos num quadrado de 256, em três
 * estilos (traço, cheio e duas cores). A lista (id, nome em português, desenho) fica em
 * icon-list.ts; os caminhos, em icon-paths.ts (gerado por scripts/gerar-desenhos-logo.ts).
 */

/** Um caminho do desenho; no estilo "duas cores", a parte clara vem com opacidade. */
export type IconPath = { d: string; opacity?: number };
export type IconPaths = { bold: IconPath[]; fill: IconPath[]; duotone: IconPath[] };

/** Os estilos de um desenho: traço (o padrão), cheio e duas cores. */
export const ICON_WEIGHTS = [
  { id: 'bold', label: 'Traço' },
  { id: 'fill', label: 'Cheio' },
  { id: 'duotone', label: 'Duas cores' },
] as const;
export type IconWeight = (typeof ICON_WEIGHTS)[number]['id'];

/** Tamanho do quadrado em que os caminhos são desenhados. */
export const ICON_VIEWBOX = 256;

export const LOGO_ICONS = LOGO_ICON_LIST;

export type LogoIconId = (typeof LOGO_ICONS)[number]['id'];

export const LOGO_ICON_IDS = LOGO_ICONS.map((icon) => icon.id) as [LogoIconId, ...LogoIconId[]];

/** Desenhos a mais, só do editor (os modelos e a conversa usam a lista curta). */
const EDITOR_ONLY_ICONS = EDITOR_ONLY_ICON_LIST;

/** Todos os desenhos que uma cena pode ter: os do estúdio e os só do editor. */
export const SCENE_ICONS = [...LOGO_ICONS, ...EDITOR_ONLY_ICONS] as const;

export type SceneIconId = (typeof SCENE_ICONS)[number]['id'];

export const SCENE_ICON_IDS = SCENE_ICONS.map((icon) => icon.id) as [SceneIconId, ...SceneIconId[]];

/** Os grupos da biblioteca do editor (os "Recomendados" vêm das categorias dela). */
export const ICON_GROUPS: { id: string; label: string; icons: SceneIconId[] }[] = [
  {
    id: 'decoracoes',
    label: 'Decorações',
    icons: [
      'coracao',
      'brilho',
      'brilhinho',
      'estrela',
      'coroa',
      'joia',
      'fita',
      'medalha',
      'trofeu',
      'raio',
      'chama',
      'sorriso',
      'cuidado',
    ],
  },
  {
    id: 'bichos',
    label: 'Bichos',
    icons: [
      'pata',
      'pegadas',
      'cachorro',
      'gato',
      'osso',
      'peixe',
      'coelho',
      'passaro',
      'tartaruga',
      'esquilo',
    ],
  },
  {
    id: 'compras',
    label: 'Compras',
    icons: [
      'sacola',
      'carrinho',
      'etiqueta',
      'loja',
      'caixa',
      'entrega',
      'desconto',
      'selo-ok',
      'presente',
    ],
  },
  {
    id: 'natureza',
    label: 'Natureza',
    icons: [
      'flor',
      'margarida',
      'folha',
      'broto',
      'trevo',
      'arvore',
      'sol',
      'lua',
      'nuvem',
      'arco-iris',
      'gota',
      'concha',
      'floco',
      'pena',
      'vaso',
      'cacto',
      'lua-estrelas',
    ],
  },
  {
    id: 'comida',
    label: 'Comida',
    icons: [
      'bolo',
      'cafe',
      'cereja',
      'maca',
      'uva',
      'limao',
      'cenoura',
      'pizza',
      'sorvete',
      'croissant',
      'biscoito',
      'doce',
      'pirulito',
      'talheres',
      'panela',
      'chapeu-chef',
    ],
  },
  {
    id: 'casa-estilo',
    label: 'Casa e estilo',
    icons: [
      'casa',
      'sofa',
      'cama',
      'banho',
      'luminaria',
      'roupa',
      'vestido',
      'tenis',
      'cabide',
      'oculos',
      'relogio',
      'tesoura',
      'paleta',
      'pincel',
      'lapis',
      'caneta',
    ],
  },
  {
    id: 'outros',
    label: 'Mais',
    icons: [
      'bebe',
      'carrinho-bebe',
      'quebra-cabeca',
      'haltere',
      'musica',
      'camera',
      'livro',
      'jogo',
      'carro',
      'bicicleta',
      'aviao',
      'ancora',
      'guarda-chuva',
      'lampada',
      'chave',
      'local',
      'globo',
    ],
  },
];

/** Ícone sugerido pra primeira categoria que ela escolheu na conversa. */
const ICON_BY_CATEGORY: Record<string, LogoIconId> = {
  'Casa e decoração': 'casa',
  Beleza: 'brilho',
  'Moda e acessórios': 'roupa',
  Infantil: 'bebe',
  Pets: 'pata',
  Cozinha: 'chapeu-chef',
  Fitness: 'haltere',
  Papelaria: 'lapis',
};

export function iconForCategories(categories: readonly string[]): LogoIconId {
  for (const category of categories) {
    const icon = ICON_BY_CATEGORY[category];
    if (icon) return icon;
  }
  return 'coracao';
}

/** Os caminhos do desenho no estilo pedido (sem o desenho, um coração: nunca fica vazio). */
export function iconPaths(id: SceneIconId, weight: IconWeight = 'bold'): IconPath[] {
  const name = SCENE_ICONS.find((icon) => icon.id === id)?.phosphor ?? 'heart';
  return (ICON_PATHS[name] ?? ICON_PATHS.heart!)[weight];
}

const ICONS_BY_CATEGORY: Record<string, SceneIconId[]> = {
  'Casa e decoração': ['casa', 'sofa', 'luminaria', 'vaso'],
  Beleza: ['brilho', 'flor', 'joia', 'cuidado'],
  'Moda e acessórios': ['roupa', 'vestido', 'cabide', 'tenis'],
  Infantil: ['bebe', 'carrinho-bebe', 'estrela', 'quebra-cabeca'],
  Pets: ['pata', 'osso', 'cachorro', 'gato'],
  Cozinha: ['chapeu-chef', 'talheres', 'bolo', 'panela'],
  Fitness: ['haltere', 'raio', 'medalha'],
  Papelaria: ['lapis', 'caneta', 'livro'],
};

/** Os desenhos que combinam com as categorias dela (os "Recomendados" do editor). */
export function iconsForCategories(categories: readonly string[]): SceneIconId[] {
  const picked = categories.flatMap((category) => ICONS_BY_CATEGORY[category] ?? []);
  const fallback: SceneIconId[] = ['coracao', 'brilho', 'estrela'];
  return [...new Set([...picked, ...fallback])].slice(0, 8);
}
