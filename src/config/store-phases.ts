/**
 * Fases da Loja Pronta, da primeira conversa até a loja no ar (docs/PRODUTO.md). Lista única:
 * o banco guarda o número da fase (1 a 7) e a tela mostra o nome e o que acontece nela.
 * Tudo é automático, sem equipe: a aluna faz cada fase pela plataforma, passo a passo.
 * `needsStudent`: a fase tem tela pra ela fazer agora. As fases ainda sem tela ficam como "em
 * breve", sem prometer publicação ou avisos automáticos antes da integração.
 */
export const STORE_PHASES = [
  {
    title: 'Conversa inicial',
    detail: 'Responda a algumas perguntas sobre suas preferências e seus planos.',
    needsStudent: true,
  },
  {
    title: 'Sua marca',
    detail: 'Escolha o nome, personalize o logo e defina a descrição.',
    needsStudent: true,
  },
  // A 3 tem o passo a passo (/loja-pronta/shopee). Na 4, a conexão depende do cadastro de
  // parceiro na Shopee: enquanto isso, ela coloca a marca na loja à mão (/loja-pronta/shopee/marca)
  // e a tela da conexão explica como ela vai ser. A 6 também depende da Shopee; a 5, da API do
  // fornecedor.
  {
    title: 'Conta na Shopee',
    detail: 'Abra sua conta de vendedora na Shopee, com o nosso passo a passo.',
    needsStudent: true,
  },
  {
    title: 'Sua marca na Shopee',
    detail: 'Coloque seu logo e o texto da loja na Shopee, com o nosso passo a passo.',
    needsStudent: true,
  },
  {
    title: 'Produtos',
    detail: 'Em breve: escolha os produtos da loja, com o preço já calculado.',
    needsStudent: false,
  },
  {
    title: 'Publicação',
    detail: 'Em breve: publique sua marca e seus produtos na Shopee pela plataforma.',
    needsStudent: false,
  },
  {
    title: 'Finalização da loja',
    detail:
      'A consulta de vendas está em breve. Confira sua loja na Central do Vendedor da Shopee.',
    needsStudent: false,
  },
] as const;

/**
 * As 3 etapas que a aluna vê: as 7 fases agrupadas com as palavras dela. A tela mostra o caminho
 * em 3 etapas (menos coisa pra entender de uma vez); as fases continuam valendo por dentro.
 * `detail`: uma linha curta (o destaque do painel é que explica a etapa atual).
 * `phases`: os números das fases (1 a 7) de cada etapa.
 */
export const STORE_STAGES = [
  {
    title: 'Conte sobre você e sua loja',
    detail: 'Responda a algumas perguntas sobre suas preferências e seus planos.',
    phases: [1],
  },
  {
    title: 'Crie a marca da sua loja',
    detail: 'Escolha o nome, personalize o logo e defina a descrição.',
    phases: [2],
  },
  {
    title: 'Prepare sua loja para a Shopee',
    detail: 'Abra sua conta, escolha os produtos e publique a loja.',
    phases: [3, 4, 5, 6, 7],
  },
] as const;
