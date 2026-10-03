/**
 * Fases da Loja Pronta, da primeira conversa até a loja no ar (docs/PRODUTO.md). Lista única:
 * o banco guarda o número da fase (1 a 7) e a tela mostra o nome e o que acontece nela.
 * Tudo é automático, sem equipe: a aluna faz cada fase pela plataforma, passo a passo.
 * `needsStudent`: a fase tem tela pra ela fazer agora. As fases ainda sem tela ficam como "em
 * breve" (o painel avisa que ela recebe um aviso no WhatsApp quando abrir).
 */
export const STORE_PHASES = [
  {
    title: 'Conversa inicial',
    // Mesmas palavras do painel da Loja Pronta.
    detail: 'Conte sobre você e sua marca, em uns 5 minutos.',
    needsStudent: true,
  },
  {
    title: 'Sua marca',
    detail: 'Escolha o nome, o logo e o texto da sua loja.',
    needsStudent: true,
  },
  // Fases 3 a 7: as telas ainda não existem. A 3 depende de um passo a passo com as telas da
  // Shopee; a 4 e a 6, do cadastro de parceiro na Shopee; a 5, da API do fornecedor.
  {
    title: 'Conta na Shopee',
    detail: 'Abra sua conta de vendedora na Shopee, com o nosso passo a passo.',
    needsStudent: false,
  },
  {
    title: 'Conexão com a Shopee',
    detail: 'Ligue sua conta da Shopee à plataforma, com um toque.',
    needsStudent: false,
  },
  {
    title: 'Produtos',
    detail: 'Escolha os produtos da loja, com o preço já calculado.',
    needsStudent: false,
  },
  {
    title: 'Publicação',
    detail: 'Sua marca e seus produtos vão pra Shopee, sem você precisar cadastrar nada.',
    needsStudent: false,
  },
  {
    title: 'Loja no ar',
    detail: 'Sua loja abre, e você acompanha as vendas aqui.',
    needsStudent: false,
  },
] as const;

/**
 * As 3 etapas que a aluna vê: as 7 fases agrupadas com as palavras dela. A tela mostra o caminho
 * em 3 etapas (menos coisa pra entender de uma vez); as fases continuam valendo por dentro.
 * `phases`: os números das fases (1 a 7) de cada etapa.
 */
export const STORE_STAGES = [
  {
    title: 'Você conta sobre você',
    detail: 'Umas perguntas rápidas sobre você e o jeito da sua marca.',
    phases: [1],
  },
  {
    title: 'Você cria a marca',
    detail: 'Nome, logo e texto da loja, com ideias já prontas.',
    phases: [2],
  },
  {
    title: 'A loja vai pra Shopee',
    detail: 'Sua conta, os produtos e a publicação, com o nosso passo a passo.',
    phases: [3, 4, 5, 6, 7],
  },
] as const;
