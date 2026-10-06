# Plano de desenvolvimento do SLL

Este plano reúne a reconstrução da área SLL da aluna e o painel administrativo. Cada tarefa é
curta e pode ser executada sozinha. Ao iniciar uma tarefa, leia `AGENTS.md`, `docs/DESIGN.md` e os
arquivos envolvidos; implemente somente a tarefa pedida e pare ao concluí-la.

## Referências obrigatórias

- Use `docs/SLL-T01-INVENTARIO.md`, `docs/SLL-T02-INVENTARIO.md` e
  `docs/SLL-T03-INVENTARIO.md` para títulos, textos, aulas, cursos, links, vídeos e arquivos.
- As capturas enviadas na conversa e a navegação de leitura no site antigo definem a organização e
  os caminhos de clique das telas da aluna. Quando houver dúvida, confira a tela antiga e o
  inventário correspondente. Não invente conteúdo ausente.
- A tela da aula enviada como exemplo é a referência direta do player: vídeo em destaque, lista de
  aulas do grupo ao lado, aula atual identificada e ações para voltar/avançar e concluir.
- Preserve a identidade visual do projeto novo: tokens, Manrope, componentes, temas claro/escuro e
  acessibilidade de `docs/DESIGN.md`. Reproduza a hierarquia e o fluxo antigos dentro desse design.
  Ajustes de UI/UX podem simplificar o uso, desde que mantenham o conteúdo e os caminhos da aluna.
- O escopo de plataforma é Shopee. TikTok Shop e Mercado Livre ficam como “Em breve”, sem conteúdo
  inventado, integração ou ação que pareça funcionar.
- SLL e Loja Pronta são compras e acessos separados. Quem tiver os dois deve poder escolher a área;
  comprar um produto não concede o outro. Dentro do SLL, só liberar a etapa seguinte após concluir a
  etapa atual.

## Tarefas

| Tarefa | Objetivo e conclusão esperada                                                                                                                                                                                        | Estado                                                  |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| T01    | Inventariar “Comece aqui” e Etapa 1: sequência, títulos, textos e referências de vídeo.                                                                                                                              | Concluída                                               |
| T02    | Inventariar Etapas 2 e 3: dias, ações, aulas, categorias, busca e materiais.                                                                                                                                         | Concluída                                               |
| T03    | Inventariar cursos complementares, banners e destinos visíveis.                                                                                                                                                      | Concluída                                               |
| T04    | Proteger as rotas e ações de administração com verificação de permissão no servidor.                                                                                                                                 | Concluída                                               |
| T05    | Criar a estrutura de dados para trilhas, etapas, módulos, aulas e blocos ordenados.                                                                                                                                  | Concluída                                               |
| T06    | Importar o conteúdo piloto documentado sem criar textos ou materiais fictícios.                                                                                                                                      | Concluída                                               |
| T07    | Mostrar no admin a hierarquia existente e uma prévia de cada aula.                                                                                                                                                   | Concluída                                               |
| T08    | Editar título, descrição, textos e links de uma aula; adicionar textos e links e salvar com validação no servidor.                                                                                                   | Implementada; revisão visual pendente                   |
| T09    | Editar e incluir vídeo, imagem e arquivo em aulas. Respeitar os provedores e o bucket existentes; mostrar erros reais de envio.                                                                                      | Implementada; revisão visual pendente                   |
| T10    | Criar, editar, excluir com confirmação recuperável e reordenar trilhas, etapas, módulos e aulas. Preservar vínculos e materiais válidos.                                                                             | Implementada; revisão visual pendente                   |
| T11    | Pré-visualizar conteúdo como aluna e publicar/despublicar com estados claros. Publicação deve respeitar os dados obrigatórios de cada tipo de bloco.                                                                 | Implementada; revisão visual pendente                   |
| T12    | Salvar conclusão e progresso por aluna, trilha e aula. Retomar do ponto certo e atualizar as contagens usadas pelas telas antigas.                                                                                   | Concluída                                               |
| T13    | Aplicar o desbloqueio em sequência entre as etapas do Método SLL e explicar com clareza qual etapa falta concluir.                                                                                                   | Concluída                                               |
| T14    | Criar o visualizador reutilizável de aulas conforme a captura: player, lista lateral do grupo, aula atual, anterior/próxima e conclusão real. No celular, reorganizar a lista sem escondê-la.                        | Implementada; revisão visual pendente                   |
| T15    | Reconstruir “Comece aqui” com as seis aulas, mensagem de abertura, lista/progresso e caminho para a Etapa 1 ao concluir.                                                                                             | Implementada; aulas aguardam publicação e player Panda  |
| T16    | Reconstruir a página do Método SLL e Etapa 1: três etapas no resumo, ferramentas e os quatro passos com as 15 aulas inventariadas. Ligar cada aula ao visualizador.                                                  | Implementada; aulas aguardam publicação e player Panda  |
| T17    | Reconstruir Etapa 2: seis prioridades em grupos expansíveis, sete ações complementares separadas e links para aulas completas. Só as seis prioridades contam no progresso.                                           | Implementada; aulas aguardam publicação                 |
| T18    | Reconstruir Etapa 3: busca, oito categorias, 19 aulas inventariadas e materiais associados, mantendo o acesso condicionado à conclusão da etapa anterior.                                                            | Implementada; aulas e arquivos aguardam migração        |
| T19    | Administrar cursos complementares: criar, editar e excluir cursos, aulas, textos, links, vídeos, arquivos e imagens; ordenar itens e definir publicação.                                                             | Implementada                                            |
| T20    | Reconstruir a biblioteca de cursos complementares Shopee e suas páginas de aula com a mesma navegação do antigo e o visualizador comum.                                                                              | Implementada; vídeos e capas aguardam migração          |
| T21    | Editar no admin os banners do painel: imagem, chamada, texto, destino e ordem; mostrar o carrossel real para a aluna.                                                                                                | Implementada; imagens originais pendentes               |
| T22    | Reconstruir Recursos/Ferramentas com os materiais conferidos. Deixar itens sem fórmula, arquivo ou destino validado como indisponíveis/em breve, sem simular funcionamento.                                          | Implementada                                            |
| T23    | Integrar “Minhas Lojas” aos dados reais disponíveis da Shopee. Status e lojas vêm do backend. Se a conexão depender de credenciais ou API ausente, registrar a dependência e mostrar “em breve”, sem botão fictício. | Implementada; depende da integração Shopee              |
| T24    | Permitir ao admin liberar ou remover SLL e Loja Pronta separadamente, com motivo registrado. Uma conta pode ter um produto ou os dois; remover um não remove o outro.                                                | Concluída                                               |
| T25    | Conferir a integração de compra e reembolso da Hotmart para os dois produtos. Compra libera somente o produto comprado; reembolso remove somente aquele acesso; eventos repetidos não duplicam liberações.           | Ignorada a pedido do usuário                            |
| T26    | Revisar o percurso completo, acessos duplos, perfil, senha, links, PDFs, navegação das aulas, etapas, temas, celular, teclado, leitor de tela e testes do projeto. Corrigir falhas encontradas.                      | Concluída; aulas ficam em rascunho até receberem vídeos |

## Revisão visual

Após cada tarefa que mudar uma tela, abrir a tela no navegador em computador e celular e nos temas
claro e escuro. Conferir foco, teclado, leitor de tela e áreas de toque conforme `AGENTS.md`. Quando
o dono pedir execução contínua, seguir pelas tarefas autorizadas e reunir as revisões ou ações
manuais pendentes ao chegar no limite informado.

## Como pedir uma tarefa

Use o identificador da tabela e execute apenas essa tarefa. Exemplo: “Execute somente a T14 do plano
SLL”. Cada entrega deve informar o que mudou, como foi verificada, o que ainda depende de material
ou integração externa e parar ao terminar.
