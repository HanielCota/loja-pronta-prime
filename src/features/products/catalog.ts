import type { ProductId } from '@/config/products';

type Product = {
  /** Nome curto, pra botões ("Ir pra Loja Pronta"). */
  name: string;
  /** Nome completo, pra títulos. */
  title: string;
  /** Título da área, com o artigo certo ("ao Sistema…", "à Loja Pronta"). */
  welcome: string;
  /** Endereço da área do produto. */
  path: `/${string}`;
  /** Uma frase do que a aluna encontra ali (docs/PRODUTO.md). */
  summary: string;
  /** Que tipo de produto é, pra diferença entre os dois saltar aos olhos na escolha. */
  tag: string;
  /** O resumo em uma linha, pro bloco da escolha. */
  pitch: string;
};

export const PRODUCTS: Record<ProductId, Product> = {
  sll: {
    name: 'SLL',
    title: 'Sistema Loja Lucrativa (SLL)',
    welcome: 'Boas-vindas ao Sistema Loja Lucrativa',
    path: '/sll',
    summary: 'O curso com ferramentas pra você aprender e vender na Shopee por conta própria.',
    tag: 'Curso · você faz',
    pitch: 'Acesse o método completo, aulas e recursos pra escalar a sua operação.',
  },
  'loja-pronta': {
    name: 'Loja Pronta',
    title: 'Loja Pronta',
    welcome: 'Boas-vindas à Loja Pronta',
    path: '/loja-pronta',
    summary: 'A nossa equipe monta a sua loja na Shopee, e você acompanha cada fase.',
    tag: 'Serviço · a gente faz',
    pitch: 'Montamos sua loja na Shopee pra você.',
  },
};
