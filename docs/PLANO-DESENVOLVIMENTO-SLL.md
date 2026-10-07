# Plano de desenvolvimento do SLL

Este plano reúne a reconstrução da área SLL da aluna e o painel administrativo. Cada tarefa é
curta e pode ser executada sozinha. Ao iniciar uma tarefa, leia `AGENTS.md`, `docs/DESIGN.md` e os
arquivos envolvidos; implemente somente a tarefa pedida e pare ao concluí-la.

## Vídeos Panda — decisão de 7 de outubro de 2026

O dono pediu a incorporação dos vídeos Panda existentes no SLL. O catálogo de 71 aulas está em
`data/sll/panda-videos.json`; a importação para o banco e a conferência estão em
`docs/SLL-VIDEOS-PANDA.md`. O player já funciona nas aulas e nas prévias do admin. Essa decisão
substitui a orientação anterior de aguardar uma definição de hospedagem. Os vídeos mantêm sua
hospedagem original; arquivos, capas e banners seguem suas pendências próprias.

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

| Tarefa | Objetivo e conclusão esperada                                                                                                                                                                                        | Estado                                                                                             |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| T01    | Inventariar “Comece aqui” e Etapa 1: sequência, títulos, textos e referências de vídeo.                                                                                                                              | Concluída                                                                                          |
| T02    | Inventariar Etapas 2 e 3: dias, ações, aulas, categorias, busca e materiais.                                                                                                                                         | Concluída                                                                                          |
| T03    | Inventariar cursos complementares, banners e destinos visíveis.                                                                                                                                                      | Concluída                                                                                          |
| T04    | Proteger as rotas e ações de administração com verificação de permissão no servidor.                                                                                                                                 | Concluída                                                                                          |
| T05    | Criar a estrutura de dados para trilhas, etapas, módulos, aulas e blocos ordenados.                                                                                                                                  | Concluída                                                                                          |
| T06    | Importar o conteúdo piloto documentado sem criar textos ou materiais fictícios.                                                                                                                                      | Concluída                                                                                          |
| T07    | Mostrar no admin a hierarquia existente e uma prévia de cada aula.                                                                                                                                                   | Concluída                                                                                          |
| T08    | Editar título, descrição, textos e links de uma aula; adicionar textos e links e salvar com validação no servidor.                                                                                                   | Implementada; revisão visual pendente                                                              |
| T09    | Editar e incluir vídeo, imagem e arquivo em aulas. Respeitar os provedores e o bucket existentes; mostrar erros reais de envio.                                                                                      | Implementada; revisão visual pendente                                                              |
| T10    | Criar, editar, excluir com confirmação recuperável e reordenar trilhas, etapas, módulos e aulas. Preservar vínculos e materiais válidos.                                                                             | Implementada; revisão visual pendente                                                              |
| T11    | Pré-visualizar conteúdo como aluna e publicar/despublicar com estados claros. Publicação deve respeitar os dados obrigatórios de cada tipo de bloco.                                                                 | Implementada; revisão visual pendente                                                              |
| T12    | Salvar conclusão e progresso por aluna, trilha e aula. Retomar do ponto certo e atualizar as contagens usadas pelas telas antigas.                                                                                   | Concluída                                                                                          |
| T13    | Aplicar o desbloqueio em sequência entre as etapas do Método SLL e explicar com clareza qual etapa falta concluir.                                                                                                   | Concluída                                                                                          |
| T14    | Criar o visualizador reutilizável de aulas conforme a captura: player, lista lateral do grupo, aula atual, anterior/próxima e conclusão real. No celular, reorganizar a lista sem escondê-la.                        | Implementada; revisão visual pendente                                                              |
| T15    | Reconstruir “Comece aqui” com as seis aulas, mensagem de abertura, lista/progresso e caminho para a Etapa 1 ao concluir.                                                                                             | Conteúdo publicado; vídeos Panda vinculados no banco local                                         |
| T16    | Reconstruir a página do Método SLL e Etapa 1: três etapas no resumo, ferramentas e os quatro passos com as 15 aulas inventariadas. Ligar cada aula ao visualizador.                                                  | Conteúdo publicado; vídeos Panda vinculados no banco local                                         |
| T17    | Reconstruir Etapa 2: seis prioridades em grupos expansíveis, sete ações complementares separadas e links para aulas completas. Só as seis prioridades contam no progresso.                                           | Conteúdo publicado; vídeos Panda vinculados no banco local                                         |
| T18    | Reconstruir Etapa 3: busca, oito categorias, 19 aulas inventariadas e materiais associados, mantendo o acesso condicionado à conclusão da etapa anterior.                                                            | Aulas e vídeos Panda vinculados; arquivos originais pendentes                                      |
| T19    | Administrar cursos complementares: criar, editar e excluir cursos, aulas, textos, links, vídeos, arquivos e imagens; ordenar itens e definir publicação.                                                             | Implementada                                                                                       |
| T20    | Reconstruir a biblioteca de cursos complementares Shopee e suas páginas de aula com a mesma navegação do antigo e o visualizador comum.                                                                              | Implementada; vídeos Panda vinculados; capas pendentes                                             |
| T21    | Editar no admin os banners do painel: imagem, chamada, texto, destino e ordem; mostrar o carrossel real para a aluna.                                                                                                | Implementada; imagens originais pendentes                                                          |
| T22    | Reconstruir Recursos/Ferramentas com os materiais conferidos. Deixar itens sem fórmula, arquivo ou destino validado como indisponíveis/em breve, sem simular funcionamento.                                          | Implementada                                                                                       |
| T23    | Integrar “Minhas Lojas” aos dados reais disponíveis da Shopee. Status e lojas vêm do backend. Se a conexão depender de credenciais ou API ausente, registrar a dependência e mostrar “em breve”, sem botão fictício. | Implementada; depende da integração Shopee                                                         |
| T24    | Permitir ao admin liberar ou remover SLL e Loja Pronta separadamente, com motivo registrado. Uma conta pode ter um produto ou os dois; remover um não remove o outro.                                                | Concluída                                                                                          |
| T25    | Conferir a integração de compra e reembolso da Hotmart para os dois produtos. Compra libera somente o produto comprado; reembolso remove somente aquele acesso; eventos repetidos não duplicam liberações.           | Implementada e testada localmente; ativação real depende dos dados da Hotmart e do envio de email. |
| T26    | Revisar o percurso completo, acessos duplos, perfil, senha, links, PDFs, navegação das aulas, etapas, temas, celular, teclado, leitor de tela e testes do projeto. Corrigir falhas encontradas.                      | Concluída; vídeos Panda conferidos localmente em 7 de outubro                                      |

## Metas de revisão do editor e da área Aprender

Estes itens registram o feedback recebido após T26 e a nova inspeção de leitura das áreas antigas
Método SLL, Recursos e Cursos Complementares. São metas pendentes, não uma declaração de que o
novo site já atende a elas. Preservar o fluxo da aluna do site antigo e o visual de
`docs/DESIGN.md`. A decisão sobre vídeos foi atualizada acima em 7 de outubro de 2026.

- [ ] **Painel da aluna:** manter o banner grande como espaço para avisos, novidades e lembretes
      gerais da plataforma, visíveis a todas as alunas com acesso. Abaixo dele, mostrar informações
      individuais, como a situação de verificação de cada loja. O admin deve editar os avisos/banners.
- [ ] **Minhas Lojas:** a estrutura deve comportar várias lojas por aluna. Por enquanto, oferecer
      somente Shopee; TikTok Shop e Mercado Livre continuam “Em breve”, sem ações fictícias.
- [ ] **Comece aqui:** reproduzir a composição da aula antiga: área principal de vídeo à esquerda,
      lista lateral de aulas com progresso e aula atual à direita, e abaixo os controles reais de aula
      anterior, próxima aula e marcar como concluída. Conferir o que já existe antes de alterar.
- [x] **Vídeo da aula:** incorporar os players Panda conferidos nas aulas e nas prévias do admin,
      em proporção 16:9 e sem reprodução automática. Sem ID válido, mostrar “Vídeo em breve”.
      O editor aceita o link ou ID do player, com validação no servidor.
- [ ] **Edição da aula:** tornar editáveis tanto o conteúdo principal quanto a lista lateral
      (títulos, ordem e relação das aulas), sem perder a navegação e o progresso reais da aluna.
- [ ] **Editor simples:** usar o padrão de arrastar para ordenar/adicionar blocos de conteúdo,
      inspirado no editor de cursos da Thinkific, sem copiar a complexidade de layout livre de
      Squarespace ou Shopify. Manter alternativa por teclado.
- [ ] **Prévia ao lado:** no computador, mostrar a prévia da experiência da aluna ao lado da edição;
      no celular, usar uma troca simples entre editar e prévia. A prévia deve incluir conteúdo em
      rascunho sem expô-lo às alunas e refletir os campos alterados antes de salvar.
- [ ] **Rascunho real:** permitir criar e revisar conteúdo sem publicar. Ao editar algo que já está
      publicado, salvar as novas alterações como rascunho separado; a versão visível à aluna só muda
      após uma ação explícita de publicar. Conferir o modelo de dados e os fluxos atuais antes de
      implementar, pois o estado “Rascunho” atual não equivale a versionamento.

### O que a nova visita confirmou

- O **Método SLL** abre três etapas e Recursos. A Etapa 1 reúne quatro passos e 15 aulas. A
  Etapa 2 tem seis prioridades com instruções expansíveis e sete ações complementares separadas;
  algumas abrem uma aula completa, outras são somente texto, sem vídeo. A Etapa 3 oferece busca,
  oito categorias e 19 aulas visíveis. Algumas aulas têm passos, PDFs, ZIP ou planilha ligados à
  aula, além de links para ferramentas.
- **Cursos Complementares** mostra um destaque e uma biblioteca com três cursos Shopee: Shopee
  ADS — Do Zero (12 aulas), Afiliados do Vendedor (8) e Blindada De Mim Mesma (11). Cada curso
  tem apresentação, capa, sequência de aulas e página individual com vídeo, texto, anterior,
  próxima e conclusão. O inventário T03 conferiu as 31 páginas; não encontrou anexos nelas.
  TikTok Shop e Mercado Livre mostram somente “Em breve”.
- **Recursos** reúne calculadora, quatro ferramentas externas e três parceiros. O antigo abre uma
  calculadora com perguntas; a fórmula e as taxas não foram verificadas, então não copiar seu
  comportamento por suposição. Os destinos das ferramentas e parceiros estão no inventário T03.
- Há inconsistências no antigo: “plano de 7 dias” com seis prioridades e apresentação da Etapa 3
  que fala em 27 aulas apesar de mostrar 19. Usar as contagens reais da lista e do progresso.
- O dono considera confuso o seletor atual do admin: cinco destinos dentro de um cartão
  recolhível, a lista de trilhas misturando áreas distintas, o formulário de edição que aparece
  acima do item escolhido e os arquivados escondidos no fim da lista. Prefere navegação por barra
  lateral, localização evidente do item e prévia **antes** de salvar.

### Tarefas novas a executar em sequência

- [x] **R00 — Navegação do admin:** substituir o cartão recolhível dos cinco destinos por uma
      navegação lateral clara. Separar edição de conteúdo (Comece aqui, Método, Cursos, Banners,
      Textos, Recursos) das operações de conta (Acessos e Hotmart), sem esconder nenhum destino.
      Ao editar um item, abrir um espaço de trabalho identificado com seu nome e caminho, perto da
      prévia; não inserir um formulário genérico no topo da lista. Dar aos arquivados um lugar
      encontrável e um caminho simples de restauração. Revisar os rótulos técnicos como “trilha”.
- [ ] **R01 — Exposição e prévia:** conferir o conteúdo importado, o que está publicado e o que
      está em rascunho. Fazer a prévia de admin mostrar inclusive rascunhos, ao lado do editor no
      computador e em aba simples no celular. A prévia reage a mudanças ainda não salvas e indica
      isso claramente; a aluna só vê o publicado. Conferir os cinco destinos da captura no admin
      para que cada um tenha ação, estado e retorno compreensíveis.
- [x] **R02 — Versões:** separar edição e publicação de conteúdo já visível. Salvar alterações
      como rascunho não muda a versão da aluna; publicar aplica a versão conferida. Dar retorno claro
      para salvar, publicar e voltar à versão anterior.
- [x] **R03 — Método editável:** permitir editar títulos, textos, ordem e cartões das três etapas;
      passos da Etapa 1; instruções das seis prioridades e sete ações opcionais da Etapa 2; e nomes,
      ordem e resumos das oito categorias da Etapa 3. Progresso e desbloqueio continuam calculados
      pelos dados reais, não por texto editável.
- [x] **R04 — Ligações entre ações e aulas:** substituir os links fixos da Etapa 2 por relações
      escolhidas no admin. Uma ação pode ter lista de passos e uma aula relacionada, ou só passos sem
      vídeo. O admin deve conseguir trocar ou retirar essa ligação sem alterar o código.
- [x] **R05 — Materiais da aula:** em qualquer aula do Método ou de curso complementar, permitir
      adicionar e ordenar texto, imagem, link, vídeo ainda vazio e arquivos. Para cada vídeo ou link,
      permitir anotação e arquivo anexo; também permitir materiais da aula inteira. Mostrar nome,
      tipo, destino e disponibilidade na prévia, e baixar apenas arquivos realmente enviados.
- [x] **R06 — Visualizador comum:** usar o mesmo padrão de aula para Comece aqui, Método e cursos:
      player/placeholder à esquerda, lista e progresso do grupo à direita, título e materiais abaixo,
      anterior/próxima e conclusão reais. A Biblioteca pode abrir uma aula isolada sem inventar
      vizinhos. Conferir no celular, teclado e leitor de tela.
- [x] **R07 — Cursos complementares:** editar destaque explicitamente, capa, chamada, descrição,
      duração e aulas; adicionar, arquivar/restaurar e reordenar cursos e aulas. Manter os três cursos
      originais como padrão e mostrar outros apenas quando publicados. O curso em destaque não deve
      depender de ser o primeiro da lista.
- [x] **R08 — Recursos e ferramentas:** editar grupos, textos, links e ordem. Permitir associar
      uma ferramenta a aulas específicas quando fizer sentido, sem transformar toda ferramenta em
      anexo. Destino inválido ou ausente aparece como “Em breve”; não implementar a calculadora sem
      fórmula validada.
- [ ] **R09 — Conferência final:** comparar cada caminho da aluna com o antigo e os inventários,
      sem copiar bugs nem promoções indevidas. Validar admin e aluna em computador/celular, temas
      claro/escuro, teclado, leitor de tela, typecheck, lint e testes.

**Revisão de 6 de outubro:** R00 e R02–R08 implementadas. R01 está parcial: a prévia reage às
alterações e fica ao lado no computador; algumas telas do admin empilham editor e prévia no celular,
em vez de oferecer a troca por abas prevista. R09 ainda exige conferência de acessibilidade completa
e comparação final de todos os caminhos. Typecheck, lint, testes e compilação passaram; as principais
telas foram abertas em computador e celular, sem rolagem horizontal nas telas móveis verificadas.

## Revisão visual

Após cada tarefa que mudar uma tela, abrir a tela no navegador em computador e celular e nos temas
claro e escuro. Conferir foco, teclado, leitor de tela e áreas de toque conforme `AGENTS.md`. Quando
o dono pedir execução contínua, seguir pelas tarefas autorizadas e reunir as revisões ou ações
manuais pendentes ao chegar no limite informado.

## Como pedir uma tarefa

Use o identificador da tabela e execute apenas essa tarefa. Exemplo: “Execute somente a T14 do plano
SLL”. Cada entrega deve informar o que mudou, como foi verificada, o que ainda depende de material
ou integração externa e parar ao terminar.
