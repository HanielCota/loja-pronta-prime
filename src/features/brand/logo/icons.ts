import {
  Baby,
  Bird,
  Cake,
  Cat,
  ChefHat,
  Cherry,
  Coffee,
  Crown,
  Dog,
  Dumbbell,
  Feather,
  Flower,
  Flower2,
  Gem,
  Gift,
  Heart,
  House,
  Lamp,
  Leaf,
  Moon,
  Palette,
  PawPrint,
  Pencil,
  Scissors,
  Shirt,
  ShoppingBag,
  Sparkles,
  Star,
  Sun,
  type IconNode,
} from 'lucide';

/**
 * Ícones do logo: o desenho dos ícones do Lucide (o mesmo conjunto das telas), em traço. Nome em
 * português pro leitor de tela e pra lista do estúdio.
 */
export const LOGO_ICONS = [
  { id: 'flor', label: 'Flor', node: Flower },
  { id: 'margarida', label: 'Margarida', node: Flower2 },
  { id: 'coracao', label: 'Coração', node: Heart },
  { id: 'brilho', label: 'Brilho', node: Sparkles },
  { id: 'estrela', label: 'Estrela', node: Star },
  { id: 'coroa', label: 'Coroa', node: Crown },
  { id: 'joia', label: 'Joia', node: Gem },
  { id: 'folha', label: 'Folha', node: Leaf },
  { id: 'pena', label: 'Pena', node: Feather },
  { id: 'passaro', label: 'Passarinho', node: Bird },
  { id: 'sol', label: 'Sol', node: Sun },
  { id: 'lua', label: 'Lua', node: Moon },
  { id: 'casa', label: 'Casa', node: House },
  { id: 'luminaria', label: 'Luminária', node: Lamp },
  { id: 'roupa', label: 'Roupa', node: Shirt },
  { id: 'sacola', label: 'Sacola', node: ShoppingBag },
  { id: 'presente', label: 'Presente', node: Gift },
  { id: 'bebe', label: 'Bebê', node: Baby },
  { id: 'pata', label: 'Pata', node: PawPrint },
  { id: 'cachorro', label: 'Cachorro', node: Dog },
  { id: 'gato', label: 'Gato', node: Cat },
  { id: 'chapeu-chef', label: 'Chapéu de chef', node: ChefHat },
  { id: 'bolo', label: 'Bolo', node: Cake },
  { id: 'cafe', label: 'Café', node: Coffee },
  { id: 'cereja', label: 'Cereja', node: Cherry },
  { id: 'haltere', label: 'Haltere', node: Dumbbell },
  { id: 'lapis', label: 'Lápis', node: Pencil },
  { id: 'paleta', label: 'Paleta', node: Palette },
  { id: 'tesoura', label: 'Tesoura', node: Scissors },
] as const satisfies readonly { id: string; label: string; node: IconNode }[];

export type LogoIconId = (typeof LOGO_ICONS)[number]['id'];

export const LOGO_ICON_IDS = LOGO_ICONS.map((icon) => icon.id) as [LogoIconId, ...LogoIconId[]];

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

export function iconNode(id: LogoIconId): IconNode {
  return LOGO_ICONS.find((icon) => icon.id === id)?.node ?? Heart;
}
