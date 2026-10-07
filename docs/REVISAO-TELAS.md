# Revisão das telas — 7 de outubro de 2026

Revisão dos 38 arquivos de página, com foco em textos, navegação, acesso, estados vazios e
diferenças entre o que funciona hoje e o que ainda depende de integrações. O visual aprovado
em `DESIGN.md` foi preservado.

## Cobertura

| Área             | Telas e estados conferidos                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Acesso           | Entrada, primeiro acesso, recuperação e redefinição de senha; sessão expirada, conta desativada, link ausente e página inexistente |
| Escolha de área  | Início e menu; conta com os dois produtos, somente SLL e sem acesso liberado                                                       |
| Perfil           | Dados pessoais, preferências de exibição e caminhos para suporte                                                                   |
| SLL              | Painel, Comece Aqui, método, três etapas, aulas, lista de cursos e três cursos complementares                                      |
| Ferramentas      | Catálogo, três calculadoras, materiais e quatro guias de assistentes externos                                                      |
| Minhas Lojas     | Andamento da Loja Pronta, conta somente SLL e explicação para adicionar loja                                                       |
| Conversa inicial | Entrada, dez perguntas, revisão, WhatsApp, orientação e confirmação de envio                                                       |
| Marca            | Entrada, nome, escolhas do estúdio, descrição, revisão, marca pronta e download do PNG                                             |
| Shopee           | Guia para criar conta, conferência da conta e explicação da conexão pendente                                                       |
| Administração    | Boas-vindas, método e cursos; prévia de aula, arquivados, banners, recursos, textos, acessos e Hotmart                             |

Os endereços dinâmicos foram conferidos com itens publicados e contas locais de teste. As
84 aulas publicadas passaram pela verificação HTTP; no navegador, foram usadas aulas
representativas de cada trilha. Isso não significa assistir a cada vídeo inteiro.

## Correções entregues

- O painel SLL mostra os caminhos de estudo e ferramentas antes do aviso da Shopee, como
  definido no design. Os testes de navegação acompanham o menu atual “Seções do SLL”.
- WhatsApp é apresentado como contato salvo. Foram removidas promessas de avisos
  automáticos, publicação e métricas que ainda não existem.
- A última fase da Loja Pronta não declara a loja publicada nem marca a jornada toda como
  concluída apenas pelo número salvo no banco.
- A marca pronta aponta para a etapa correta da conta. Uma loja em fase posterior não
  volta para um guia que recusaria seu acesso.
- O guia Shopee e o estúdio não prometem prazos de aprovação ou geração não garantidos.
  A barra de geração informa que é uma estimativa.
- A escolha de área só recomenda aulas SLL para quem tem esse produto. A opção “Verificar
  de novo” consulta o servidor com uma nova navegação completa.
- Entrada, recuperação, conta desativada e suporte explicam o caminho disponível hoje,
  inclusive como criar a primeira senha.
- A configuração Hotmart rejeita códigos iguais para os dois produtos antes de alterar o
  banco. Mensagens de erro e sucesso têm estados e anúncios acessíveis distintos.
- As preferências de exibição são carregadas pelo componente de script do Next antes da
  interação. A navegação revisada não apresentou erros no console após essa correção.
- O editor explica que aceita URL ou ID do Panda. A documentação do produto descreve o
  estúdio, o admin e as integrações que realmente existem.

## Validação

- Typecheck, lint, build de produção e 306 testes de unidade passaram, incluindo a proteção
  do design. O runtime foi preparado com arquivos públicos, fontes e migrações.
- 199 verificações HTTP: 154 respostas 200, 41 redirecionamentos e 4 respostas 404 esperadas;
  nenhum erro 500 ou tela de falha do aplicativo.
- 256 conferências de telas no navegador, combinando celular (390 px), computador
  (1280 px) e temas claro e escuro, sem transbordamento horizontal. As famílias principais
  também foram inspecionadas visualmente e com navegação por teclado.
- Formulários nativos, sem executar JavaScript: login, validação de nome, confirmação da
  marca, avanço para a etapa de conexão e rejeição de códigos Hotmart duplicados. O download
  protegido retornou um PNG real do bucket. Os códigos Hotmart existentes permaneceram
  iguais após o teste de rejeição.
- A confirmação e os avanços usaram somente contas locais descartáveis. O PNG do teste foi
  identificado como fixture; não foi apresentado como uma geração real da OpenAI.

A suíte Playwright completa e o scanner automatizado axe não foram executados nesta rodada.
As expectativas de E2E foram atualizadas e passaram pelo typecheck. Também não foram feitos
novos pedidos pagos de geração ou transcrição, nem compras ou autorizações externas.

## O que ainda precisa ser concluído

- **Shopee:** autorização oficial, produtos do fornecedor, publicação e consulta de vendas.
  As telas informam “Em breve”; o guia de criação da conta já está disponível.
- **Hotmart e email:** confirmar os códigos e o token reais, configurar o serviço de email e
  concluir o convite automático para criar a primeira senha. O webhook já libera o produto,
  mas hoje não envia esse convite. Não basta salvar a configuração para considerar essa
  jornada concluída. Ver `INTEGRACAO-HOTMART.md`.
- **WhatsApp:** implementar o envio automático antes de prometer notificações.
- **Conteúdo:** obter os anexos originais ainda ausentes, corrigir o destino Envio Velox e
  enviar o vídeo original de orientação da Loja Pronta. Inventário em `SLL-FERRAMENTAS.md`.
- **Uso sem JavaScript:** ampliar a alternativa dos envios administrativos e do estúdio
  interativo. A verificação dos formulários nativos acima não cobre essas operações.

Esses itens são trabalho real restante, não funções simuladas pela interface. Eles não foram
implementados como parte desta revisão de telas.
