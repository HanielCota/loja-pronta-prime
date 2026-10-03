import { BRAND_DESCRIPTION_MAX, BRAND_NAME_MAX } from '@/config/brand';
import type { OnboardingAnswers } from '@/config/onboarding';

/**
 * Sugestões de nome e de descrição, montadas com as respostas da conversa. Sem IA: palavras e
 * frases prontas, combinadas com o que ela contou (categorias, estilo, sentimento e o nome dela).
 * Sempre as mesmas pra as mesmas respostas, pra a tela não mudar a cada visita.
 */

const CATEGORY_WORDS: Record<string, readonly string[]> = {
  'Casa e decoração': ['Casa', 'Lar', 'Decor'],
  Beleza: ['Beleza', 'Glow', 'Bela'],
  'Moda e acessórios': ['Moda', 'Estilo', 'Charme'],
  Infantil: ['Kids', 'Baby', 'Pequenos'],
  Pets: ['Pet', 'Patinhas', 'Bichos'],
  Cozinha: ['Cozinha', 'Sabor', 'Panelinha'],
  Fitness: ['Fit', 'Movimento', 'Energia'],
  Papelaria: ['Papel', 'Rabisco', 'Papelaria'],
};

const STYLE_WORDS: Record<string, readonly string[]> = {
  Delicado: ['Doce', 'Encanto', 'Flor'],
  Moderno: ['Nova', 'Prime', 'Up'],
  Divertido: ['Alegria', 'Mundo', 'Festa'],
  Elegante: ['Maison', 'Bella', 'Luxo'],
};

/** "Acolhidas" vira "acolhida": a cliente, no singular, na frase da descrição. */
const FEELING: Record<string, string> = {
  Acolhidas: 'acolhida',
  Seguras: 'segura',
  Alegres: 'alegre',
  Especiais: 'especial',
  'Bem atendidas': 'bem atendida',
  Inspiradas: 'inspirada',
};

const list = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
const text = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

/** "a", "a e b", "a, b e c". */
export function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`;
}

/** 6 nomes diferentes, todos dentro do limite da Shopee. */
export function nameSuggestions(answers: OnboardingAnswers, studentName: string): string[] {
  const categories = list(answers.categorias);
  const words = categories.flatMap((category) => CATEGORY_WORDS[category] ?? []);
  const [first = 'Loja', second = first, third = second] = words.length ? words : ['Loja'];
  const style = STYLE_WORDS[text(answers.estilo) ?? ''] ?? STYLE_WORDS.Moderno!;
  const [adjective = 'Nova', other = 'Prime', place = 'Mundo'] = style;
  const owner = studentName.trim().split(/\s+/)[0] ?? '';

  const candidates = [
    owner && `${first} da ${owner}`,
    `${adjective} ${first}`,
    `${place} ${second}`,
    owner && `Cantinho da ${owner}`,
    `${third} & Cia`,
    `${first} ${other}`,
    `Ateliê ${second}`,
    `Espaço ${third}`,
    `${adjective} ${third}`,
  ];
  const unique = [...new Set(candidates.filter(Boolean))].filter(
    (name) => name.length <= BRAND_NAME_MAX,
  );
  return unique.slice(0, 6);
}

/** 3 descrições prontas pra ela escolher (e editar), dentro do limite da Shopee. */
export function descriptionSuggestions(answers: OnboardingAnswers, storeName: string): string[] {
  const categories = list(answers.categorias).map((category) => category.toLowerCase());
  const products = categories.length ? `produtos de ${joinList(categories)}` : 'produtos';
  const feelings = list(answers.sentimento)
    .map((feeling) => FEELING[feeling])
    .filter((feeling): feeling is string => Boolean(feeling));
  const feel = feelings.length ? joinList(feelings) : 'bem atendida';

  return [
    `Na loja ${storeName}, você encontra ${products} escolhidos com carinho, pra você se sentir ${feel}. Enviamos pra todo o Brasil, com atendimento rápido e atencioso.`,
    `${storeName}: ${products} com qualidade e preço justo. Cada pedido é preparado com cuidado, pra você comprar com tranquilidade e se sentir ${feel}.`,
    `Boas-vindas à loja ${storeName}! Separamos ${products} que deixam o dia a dia mais bonito e prático. Siga a loja pra acompanhar as novidades e as promoções.`,
  ].map((description) => description.slice(0, BRAND_DESCRIPTION_MAX));
}
