/**
 * Fases da Loja Pronta, da primeira conversa até a loja no ar (docs/PRODUTO.md). Lista única:
 * o banco guarda o número da fase (1 a 7) e a tela mostra o nome e o que acontece nela.
 */
export const STORE_PHASES = [
  { title: 'Conversa inicial', detail: 'A gente conhece o seu perfil e o que você gosta.' },
  {
    title: 'Logo e descrição',
    detail: 'Você escolhe entre opções de logo e de descrição criadas pra sua loja.',
  },
  { title: 'Conexão com a Shopee', detail: 'A sua loja é ligada à sua conta na Shopee.' },
  { title: 'Verificação de identidade', detail: 'A Shopee confere os seus dados.' },
  {
    title: 'Fornecedor e produtos',
    detail: 'Definimos o fornecedor e os produtos que a sua loja vai vender.',
  },
  { title: 'Publicação dos produtos', detail: 'A equipe cadastra os produtos na sua loja.' },
  { title: 'Loja no ar', detail: 'A loja abre, e a gente acompanha as primeiras semanas.' },
] as const;
