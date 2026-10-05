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
  Tecnologia: ['Tech', 'Conecta', 'Digital'],
};

const STYLE_WORDS: Record<string, readonly string[]> = {
  Delicado: ['Doce', 'Encanto', 'Flor'],
  Moderno: ['Nova', 'Prime', 'Up'],
  Divertido: ['Alegria', 'Mundo', 'Festa'],
  Elegante: ['Maison', 'Bella', 'Luxo'],
  Natural: ['Natural', 'Raiz', 'Terra'],
  Profissional: ['Pro', 'Select', 'Central'],
  Artesanal: ['Feito à Mão', 'Arte', 'Ateliê'],
};

/**
 * A sensação da marca como a cliente se sente ("Confiança" vira "segura"), pra frase da
 * descrição: "pra você se sentir segura".
 */
const FEELING: Record<string, string> = {
  Confiança: 'segura',
  Acolhimento: 'acolhida',
  Sofisticação: 'especial',
  Energia: 'cheia de energia',
  Sustentabilidade: 'consciente',
  Diversão: 'alegre',
  Exclusividade: 'única',
  Praticidade: 'tranquila',
  Delicadeza: 'cuidada',
  Inovação: 'inspirada',
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

/** Sem palavra repetida ("Casa Casa", "Pet & Pet"): soa como erro. */
const repeatsWord = (name: string): boolean => {
  const words = name
    .toLowerCase()
    .split(/[\s&]+/)
    .filter(Boolean);
  return new Set(words).size !== words.length;
};

/**
 * Nomes diferentes (6, ou `limit`), todos dentro do limite da Shopee. Os primeiros são os mais
 * fortes; os outros servem pro "Outras ideias".
 */
export function nameSuggestions(
  answers: OnboardingAnswers,
  studentName: string,
  limit = 6,
): string[] {
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
    `${other} ${second}`,
    `Clube ${first}`,
    owner && `${second} da ${owner}`,
    `${first} & ${second}`,
    `Universo ${third}`,
    `${place} ${first}`,
    `Empório ${second}`,
    owner && `Ateliê da ${owner}`,
    `${adjective} ${second}`,
  ];
  const unique = [...new Set(candidates.filter(Boolean))].filter(
    (name) => name.length <= BRAND_NAME_MAX && !repeatsWord(name),
  );
  return unique.slice(0, limit);
}

/**
 * Cada categoria como cabe em "produtos de ...": uma palavra só, pra lista não virar "beleza e casa
 * e decoração" (o "e" de dentro da categoria se confunde com o da lista).
 */
const CATEGORY_PRODUCTS: Record<string, string> = {
  'Casa e decoração': 'decoração',
  Beleza: 'beleza',
  'Moda e acessórios': 'moda',
  Infantil: 'infância',
  Pets: 'pets',
  Cozinha: 'cozinha',
  Fitness: 'fitness',
  Papelaria: 'papelaria',
  Tecnologia: 'tecnologia',
};

/** Um jeito de falar da descrição, com as versões dele (o "Outro texto" passa de uma pra outra). */
export type DescriptionTone = {
  id: 'carinhoso' | 'direto' | 'animado';
  label: string;
  texts: string[];
};

/**
 * As descrições prontas, por jeito de falar (carinhoso, direto, animado), 3 versões de cada, todas
 * com o nome da loja, o que ela vende e como quer que a cliente se sinta. Dentro do limite da
 * Shopee.
 */
export function descriptionTones(answers: OnboardingAnswers, storeName: string): DescriptionTone[] {
  const categories = list(answers.categorias)
    // "Outros" não diz o que ela vende: na frase, fica só "produtos".
    .filter((category) => category !== 'Outros')
    .map((category) => CATEGORY_PRODUCTS[category] ?? category.toLowerCase())
    .slice(0, 3);
  const products = categories.length ? `produtos de ${joinList(categories)}` : 'produtos';
  const Products = products.charAt(0).toUpperCase() + products.slice(1);
  const feelings = list(answers.sentimento)
    .map((feeling) => FEELING[feeling])
    .filter((feeling): feeling is string => Boolean(feeling));
  const feel = feelings.length ? joinList(feelings) : 'bem atendida';
  const name = storeName;

  const tones: DescriptionTone[] = [
    {
      id: 'carinhoso',
      label: 'Carinhoso',
      texts: [
        `Na loja ${name}, você encontra ${products} escolhidos com carinho, pra você se sentir ${feel}. Enviamos pra todo o Brasil, com atendimento rápido e atencioso.`,
        `Que bom ter você aqui! A ${name} separa ${products} com todo o cuidado, pra você se sentir ${feel}. Cada pedido sai embalado com carinho.`,
        `Bem-vinda à ${name}! Aqui cada detalhe é pensado com amor: ${products} que deixam o seu dia mais leve. Estamos sempre por perto pra te ajudar.`,
      ],
    },
    {
      id: 'direto',
      label: 'Direto',
      texts: [
        `${name}: ${products} com qualidade e preço justo. Cada pedido é preparado com cuidado, pra você comprar com tranquilidade e se sentir ${feel}.`,
        `${Products} com bom preço e envio rápido pra todo o Brasil. Na ${name}, você compra com segurança e recebe tudo certinho.`,
        `A ${name} reúne ${products} com ótimo custo-benefício. Compra fácil, envio rápido e atendimento que responde de verdade.`,
      ],
    },
    {
      id: 'animado',
      label: 'Animado',
      texts: [
        `Boas-vindas à loja ${name}! Separamos ${products} que deixam o dia a dia mais bonito e prático. Siga a loja pra acompanhar as novidades e as promoções.`,
        `Chegou na ${name}? Então se prepare: ${products} lindos, novidades toda semana e promoções que você não vai querer perder. Siga a loja!`,
        `Aqui na ${name} tem ${products} pra todo gosto! Novidades chegando sempre e ofertas especiais pra quem segue a loja. Vem conferir!`,
      ],
    },
  ];
  return tones.map((tone) => ({
    ...tone,
    texts: tone.texts.map((item) => item.slice(0, BRAND_DESCRIPTION_MAX)),
  }));
}
