# Referência visual do SLL

Inspeção em 6 de outubro de 2026 de `https://membros.escalashop.com.br/sll`, com a conta
autorizada pelo dono. A conta já estava conectada. Foram visitadas apenas as páginas do SLL;
nenhuma aula, loja ou preferência da conta original foi alterada. Credenciais não fazem parte
deste documento.

## Composição observada e adaptação

| Página       | Referência                                                                                               | Adaptação na Loja Pronta Prime                                                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Painel       | Menu lateral, banner amplo, saudação e situação individual da loja.                                      | Mesma ordem; aviso individual compacto, atalhos reais para aulas e ferramentas. O banner usa os textos e arquivos publicados pelo admin.                       |
| Menu         | Minha operação e Aprender; etapas aparecem dentro do Método.                                             | Cartão lateral de 240px, azul na seção atual, etapas contextuais e controle expansível no celular.                                                             |
| Comece aqui  | Vídeo à esquerda, sequência e progresso à direita; título, anterior/próxima e conclusão abaixo do vídeo. | Visualizador comum, proporção 16:9, lista que acompanha a rolagem e conclusão por Server Action. Vídeo ausente permanece indisponível.                         |
| Método       | Três cartões de etapas e acesso às ferramentas.                                                          | Cartões alinhados, títulos inteiros, contagens reais e barras acessíveis; desbloqueio sequencial existente preservado.                                         |
| Etapa 1      | Quatro passos, com contagens e acesso às aulas.                                                          | Passos expansíveis para reduzir a página; a aula a retomar determina o passo aberto. Todas as aulas continuam acessíveis dentro do passo.                      |
| Etapa 2      | Prioridades expansíveis e ações complementares separadas.                                                | Mesma separação, progresso existente e indicadores claros de abertura. Sem inventar plano gerado ou botão de refazer.                                          |
| Etapa 3      | Busca, categorias e cartões de aula com situação e chamada.                                              | Grade por categoria, busca por título/descrição e conclusão real; nomes e contagens vêm do catálogo publicado.                                                 |
| Cursos       | Destaque e biblioteca com capas, títulos e quantidade de aulas.                                          | Destaque amplo, até três cartões por linha, capa original quando enviada e progresso individual. Lista do curso numerada e com duração.                        |
| Recursos     | Calculadora, quatro assistentes e parceiros, com chamadas específicas.                                   | Grupos e destinos publicados existentes, cartões de altura natural e ícones sobre superfície azul suave. Calculadora sem fórmula validada continua “Em breve”. |
| Minhas Lojas | Lojas conectadas, situação e ação de adicionar.                                                          | Estado honesto da conexão ainda indisponível. Não copiar lojas da conta de referência nem criar ações que simulam conexão.                                     |

## Refinamentos

- Manrope, corpo de 17px, cartões de 28px, sombras e cores definidos em `docs/DESIGN.md`.
- Tema escuro grafite, foco visível, alvos de pelo menos 44px e suporte a movimento reduzido.
- Barras nativas de progresso com nome e valor; não depender só da cor para indicar conclusão.
- Menu curto fora do Método; navegação móvel fecha ao trocar de página.
- Texto não é truncado em títulos de etapas, cursos ou aulas. Ações de etapa dizem “Continuar”
  quando há progresso e “Revisar” apenas quando a etapa está concluída.
- A conclusão de uma aula não é carregada para a aula seguinte; cada visualizador tem estado
  próprio, e o progresso é salvo pelo fluxo existente. Comece aqui guarda a aula no endereço:
  concluir atualiza o progresso e mantém a aula à vista, até a aluna escolher a próxima.

## Dependências preservadas

Na base local conferida, os dois banners estão em rascunho. Imagens originais de banners e capas
devem entrar pelo admin; não foram publicadas versões incompletas para produzir uma captura.
Hospedagem dos vídeos, integração Shopee e fórmula da calculadora continuam com o estado real
do sistema. Não foram migrados vídeos nem conteúdo de contas do site anterior.

A Loja Pronta, os fluxos de acesso, o perfil, o admin e os tokens globais não foram redesenhados.

## Conferência da implementação

- `bun run typecheck`, `bun run lint` e `bun test src`: aprovados; 218 testes unitários.
- Revisão ampliada em [SLL-REVISAO-UI-UX.md](SLL-REVISAO-UI-UX.md), com Playwright na base local
  e com aluna de teste: 15 páginas em cinco larguras, nos dois temas, totalizando 150
  verificações de acessibilidade WCAG 2.2 AA/boas práticas e
  ausência de rolagem horizontal.
- Conclusão e desmarcação persistidas, troca de aula sem carregar o estado anterior e menu móvel
  operado pelo teclado: aprovados.
- Tela de 320px, alto contraste do Windows, movimento reduzido e alvos de 44px: aprovados nas
  páginas verificadas. Conclusão de aula sem JavaScript: aprovada.
- O carrossel publicado não foi exercitado com imagens reais: os banners locais seguem em
  rascunho. A revisão não publicou arquivos ou modificou a conta do site de referência.

As capturas e o roteiro desta conferência ficam em `.data/sll-review-screens` e
`.data/sll-review.spec.ts`, fora do versionamento, sem dados da conta original.
