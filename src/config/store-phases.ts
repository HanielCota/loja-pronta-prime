/**
 * Fases da Loja Pronta, da primeira conversa até a loja no ar (docs/PRODUTO.md). Lista única:
 * o banco guarda o número da fase (1 a 7) e a tela mostra o nome e o que acontece nela.
 * `needsStudent`: a fase anda com algo que a aluna faz (conversar, escolher, conectar, confirmar
 * os dados); nas outras, quem trabalha é a equipe.
 */
export const STORE_PHASES = [
  {
    title: 'Conversa inicial',
    detail: 'A gente conhece o seu perfil e o que você gosta.',
    needsStudent: true,
  },
  {
    title: 'Logo e descrição',
    detail: 'Você escolhe entre opções de logo e de descrição criadas pra sua loja.',
    needsStudent: true,
  },
  {
    title: 'Conexão com a Shopee',
    detail: 'A sua loja é ligada à sua conta na Shopee.',
    needsStudent: true,
  },
  {
    title: 'Verificação de identidade',
    detail: 'A Shopee confere os seus dados.',
    needsStudent: true,
  },
  {
    title: 'Fornecedor e produtos',
    detail: 'Definimos o fornecedor e os produtos que a sua loja vai vender.',
    needsStudent: false,
  },
  {
    title: 'Publicação dos produtos',
    detail: 'A equipe cadastra os produtos na sua loja.',
    needsStudent: false,
  },
  {
    title: 'Loja no ar',
    detail: 'A loja abre, e a gente acompanha as primeiras semanas.',
    needsStudent: false,
  },
] as const;
