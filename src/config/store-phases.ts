/**
 * Fases da Loja Pronta, da primeira conversa até a loja no ar (docs/PRODUTO.md). Lista única:
 * o banco guarda o número da fase (1 a 7) e a tela mostra o nome e o que acontece nela.
 * `needsStudent`: a fase anda com algo que a aluna faz (conversar, escolher, conectar, confirmar
 * os dados); nas outras, quem trabalha é a equipe.
 */
export const STORE_PHASES = [
  {
    title: 'Conversa inicial',
    // Mesmas palavras do painel da Loja Pronta.
    detail: 'Conte sobre você e sua marca, em uns 5 minutos.',
    needsStudent: true,
  },
  {
    title: 'Logo e descrição',
    detail: 'A equipe cria opções de logo e de descrição, e você escolhe as favoritas.',
    // A escolha das opções ainda não está na plataforma: por enquanto, ela espera a equipe.
    needsStudent: false,
  },
  // As fases 3 e 4 dependem dela, mas as telas delas ainda não estão na plataforma (a equipe
  // conduz pelo WhatsApp): até existirem, a escolha de área não aponta pra uma página sem ação.
  {
    title: 'Conexão com a Shopee',
    detail: 'Sua loja é ligada à sua conta na Shopee.',
    needsStudent: false,
  },
  {
    title: 'Verificação de identidade',
    detail: 'A Shopee confere seus dados.',
    needsStudent: false,
  },
  {
    title: 'Fornecedor e produtos',
    detail: 'A equipe define o fornecedor e os produtos da loja.',
    needsStudent: false,
  },
  {
    title: 'Publicação dos produtos',
    detail: 'A equipe cadastra os produtos na sua loja.',
    needsStudent: false,
  },
  {
    title: 'Loja no ar',
    detail: 'A loja abre, e a equipe acompanha as primeiras semanas.',
    needsStudent: false,
  },
] as const;
