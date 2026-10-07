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

| Tarefa | Objetivo e conclusão esperada                                                                                                                                                                                        | Estado                                                                                                      |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| T01    | Inventariar “Comece aqui” e Etapa 1: sequência, títulos, textos e referências de vídeo.                                                                                                                              | Concluída                                                                                                   |
| T02    | Inventariar Etapas 2 e 3: dias, ações, aulas, categorias, busca e materiais.                                                                                                                                         | Concluída                                                                                                   |
| T03    | Inventariar cursos complementares, banners e destinos visíveis.                                                                                                                                                      | Concluída                                                                                                   |
| T04    | Proteger as rotas e ações de administração com verificação de permissão no servidor.                                                                                                                                 | Concluída                                                                                                   |
| T05    | Criar a estrutura de dados para trilhas, etapas, módulos, aulas e blocos ordenados.                                                                                                                                  | Concluída                                                                                                   |
| T06    | Importar o conteúdo piloto documentado sem criar textos ou materiais fictícios.                                                                                                                                      | Concluída                                                                                                   |
| T07    | Mostrar no admin a hierarquia existente e uma prévia de cada aula.                                                                                                                                                   | Concluída                                                                                                   |
| T08    | Editar título, descrição, textos e links de uma aula; adicionar textos e links e salvar com validação no servidor.                                                                                                   | Implementada; revisão visual pendente                                                                       |
| T09    | Editar e incluir vídeo, imagem e arquivo em aulas. Respeitar os provedores e o bucket existentes; mostrar erros reais de envio.                                                                                      | Implementada; revisão visual pendente                                                                       |
| T10    | Criar, editar, excluir com confirmação recuperável e reordenar trilhas, etapas, módulos e aulas. Preservar vínculos e materiais válidos.                                                                             | Implementada; revisão visual pendente                                                                       |
| T11    | Pré-visualizar conteúdo como aluna e publicar/despublicar com estados claros. Publicação deve respeitar os dados obrigatórios de cada tipo de bloco.                                                                 | Concluída                                                                                                   |
| T12    | Salvar conclusão e progresso por aluna, trilha e aula. Retomar do ponto certo e atualizar as contagens usadas pelas telas antigas.                                                                                   | Concluída                                                                                                   |
| T13    | Aplicar o desbloqueio em sequência entre as etapas do Método SLL e explicar com clareza qual etapa falta concluir.                                                                                                   | Concluída                                                                                                   |
| T14    | Criar o visualizador reutilizável de aulas conforme a captura: player, lista lateral do grupo, aula atual, anterior/próxima e conclusão real. No celular, reorganizar a lista sem escondê-la.                        | Implementada; revisão visual pendente                                                                       |
| T15    | Reconstruir “Comece aqui” com as seis aulas, mensagem de abertura, lista/progresso e caminho para a Etapa 1 ao concluir.                                                                                             | Etapa 04: interface validada localmente; seis aulas importadas como rascunho; publicação e vídeos pendentes |
| T16    | Reconstruir a página do Método SLL e Etapa 1: três etapas no resumo, ferramentas e os quatro passos com as 15 aulas inventariadas. Ligar cada aula ao visualizador.                                                  | Conteúdo inicial publicado; vídeos em branco até definição da hospedagem                                    |
| T17    | Reconstruir Etapa 2: seis prioridades em grupos expansíveis, sete ações complementares separadas e links para aulas completas. Só as seis prioridades contam no progresso.                                           | Conteúdo inicial publicado; vídeos em branco até definição da hospedagem                                    |
| T18    | Reconstruir Etapa 3: busca, oito categorias, 19 aulas inventariadas e materiais associados, mantendo o acesso condicionado à conclusão da etapa anterior.                                                            | Estrutura e aulas publicadas; migração de arquivos originais pendente                                       |
| T19    | Administrar cursos complementares: criar, editar e excluir cursos, aulas, textos, links, vídeos, arquivos e imagens; ordenar itens e definir publicação.                                                             | Implementada                                                                                                |
| T20    | Reconstruir a biblioteca de cursos complementares Shopee e suas páginas de aula com a mesma navegação do antigo e o visualizador comum.                                                                              | Implementada; vídeos e capas aguardam migração                                                              |
| T21    | Editar no admin os banners do painel: imagem, chamada, texto, destino e ordem; mostrar o carrossel real para a aluna.                                                                                                | Implementada; imagens originais pendentes                                                                   |
| T22    | Reconstruir Recursos/Ferramentas com os materiais conferidos. Deixar itens sem fórmula, arquivo ou destino validado como indisponíveis/em breve, sem simular funcionamento.                                          | Implementada                                                                                                |
| T23    | Integrar “Minhas Lojas” aos dados reais disponíveis da Shopee. Status e lojas vêm do backend. Se a conexão depender de credenciais ou API ausente, registrar a dependência e mostrar “em breve”, sem botão fictício. | Implementada; depende da integração Shopee                                                                  |
| T24    | Permitir ao admin liberar ou remover SLL e Loja Pronta separadamente, com motivo registrado. Uma conta pode ter um produto ou os dois; remover um não remove o outro.                                                | Concluída                                                                                                   |
| T25    | Conferir a integração de compra e reembolso da Hotmart para os dois produtos. Compra libera somente o produto comprado; reembolso remove somente aquele acesso; eventos repetidos não duplicam liberações.           | Implementada e testada localmente; ativação real depende dos dados da Hotmart e do envio de email.          |
| T26    | Revisar o percurso completo, acessos duplos, perfil, senha, links, PDFs, navegação das aulas, etapas, temas, celular, teclado, leitor de tela e testes do projeto. Corrigir falhas encontradas.                      | Concluída; aulas ficam em rascunho até receberem vídeos                                                     |

## Metas de revisão do editor e da área Aprender

Estes itens registram o feedback recebido após T26 e a nova inspeção de leitura das áreas antigas
Método SLL, Recursos e Cursos Complementares. São metas pendentes, não uma declaração de que o
novo site já atende a elas. Preservar o fluxo da aluna do site antigo e o visual de
`docs/DESIGN.md`. Os vídeos seguem sem solução de hospedagem definida.

- [ ] **Painel da aluna:** manter o banner grande como espaço para avisos, novidades e lembretes
      gerais da plataforma, visíveis a todas as alunas com acesso. Abaixo dele, mostrar informações
      individuais, como a situação de verificação de cada loja. O admin deve editar os avisos/banners.
- [ ] **Minhas Lojas:** a estrutura deve comportar várias lojas por aluna. Por enquanto, oferecer
      somente Shopee; TikTok Shop e Mercado Livre continuam “Em breve”, sem ações fictícias.
- [ ] **Comece aqui:** reproduzir a composição da aula antiga: área principal de vídeo à esquerda,
      lista lateral de aulas com progresso e aula atual à direita, e abaixo os controles reais de aula
      anterior, próxima aula e marcar como concluída. Conferir o que já existe antes de alterar.
- [ ] **Espaço do vídeo:** enquanto a hospedagem não for decidida, mostrar um retângulo vazio na
      proporção do player com ícone de reprodução e texto claro de indisponibilidade. Não escolher
      Panda Video nem upload como solução definitiva agora. O admin deve poder editar o material da
      aula depois que a decisão for tomada.
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
- [x] **R09 — Conferência final com limitações documentadas:** comparar cada caminho da aluna
      com o antigo e os inventários, sem copiar bugs nem promoções indevidas. A revisão local
      validou os caminhos da aluna em computador/celular simulados, temas claro/escuro, teclado,
      typecheck, lint e testes; as limitações de leitor de tela manual, admin completo,
      integrações e conteúdo real estão registradas em [SLL-T18-REVISAO.md](SLL-T18-REVISAO.md).

**Revisão de 6 de outubro:** R00 e R02–R08 implementadas. R01 está parcial: a prévia reage às
alterações e fica ao lado no computador; algumas telas do admin empilham editor e prévia no celular,
em vez de oferecer a troca por abas prevista. Naquela data, R09 ainda exigia conferência de acessibilidade completa
e comparação final de todos os caminhos. Typecheck, lint, testes e compilação passaram; as principais
telas foram abertas em computador e celular, sem rolagem horizontal nas telas móveis verificadas.

## Conferência da Etapa 18 — 7 de outubro de 2026

O R09 foi conferido no checkout local e está registrado em
[SLL-T18-REVISAO.md](SLL-T18-REVISAO.md). A revisão cobriu a experiência publicada da aluna,
navegação, progresso, desbloqueios, recursos, cursos, Minhas Lojas, temas, teclado, estados
indisponíveis e compatibilidade nas larguras disponíveis. `bun run typecheck`, `bun run lint`,
`bun test src` e `git diff --check` passaram; os roteiros Playwright exercitados também passaram
após repetição sequencial sem a colisão de artefatos de trace.

O resultado não declara produção, integrações externas, reprodução de vídeos, downloads reais,
publicação de banners/capas ou sessão manual com leitor de tela. Essas limitações e as
pré-condições incompatíveis dos testes isolados estão separadas no registro da etapa. A Etapa 19
não foi iniciada.

## Revisão visual

Após cada tarefa que mudar uma tela, abrir a tela no navegador em computador e celular e nos temas
claro e escuro. Conferir foco, teclado, leitor de tela e áreas de toque conforme `AGENTS.md`. Quando
o dono pedir execução contínua, seguir pelas tarefas autorizadas e reunir as revisões ou ações
manuais pendentes ao chegar no limite informado.

## Como pedir uma tarefa

Use o identificador da tabela e execute apenas essa tarefa. Exemplo: “Execute somente a T14 do plano
SLL”. Cada entrega deve informar o que mudou, como foi verificada, o que ainda depende de material
ou integração externa e parar ao terminar.

## Conferência da Etapa 04 — Comece aqui

Execução em 6 de outubro de 2026 conforme a Etapa 4 do arquivo
`SLL PROMPT DETALHADO - LUNA HIGH.txt`. Estado: **parcial**, com o código preparado para revisão
e o conteúdo real ainda em rascunho. A fonte de conteúdo é o inventário T01; esta execução não
confere novamente a conta da referência nem presume aprovação formal de etapas anteriores.

### A. Identificação

Etapa autorizada: **04 — Comece aqui**, entrega local. Interface e fluxo prontos para revisão;
etapa **parcial** devido à publicação real pendente. A Etapa 02 consta como entregue para
revisão; a Etapa 03 está em execução em outra conversa. Não foi presumida aprovação formal.

### B. Resultado e limites

- Reutilizados `SllShell`, `SllAreaShell`, `SllLessonViewer`, `Button`, `LiveRegion`,
  `SllProgress`, `panelCard`, tokens e persistência existentes. Nenhuma outra moldura foi criada.
- Os links de boas-vindas, inclusive os do painel, conservam a aula no endereço de Comece aqui.
  A rota antiga de aula redireciona para a mesma aula; o login conserva o destino escolhido.
- Conclusão e desmarcação são salvas por sessão/aluna e UUID da aula. A conclusão aparece por
  texto e na lista. Trocar de aula não reaproveita o estado da anterior. O avanço é explícito.
- O caminho para o Método fica junto das ações somente quando a trilha está concluída e há
  Método publicado. O vídeo ausente usa aviso compacto, também quando não há bloco de vídeo.
- Falha de gravação apresenta mensagem e conserva a conclusão anterior. A guarda de acesso
  continua no servidor; redirecionamentos não são transformados em sucesso ou erro de banco.
- O importador existente criou as seis aulas confirmadas como **rascunho**, sem sobrescrever
  edições. Não foram publicados rascunhos reais nem alteradas conclusões de contas existentes.
- A base real contém o Método em rascunho; os dois IDs do Passo 1 estão registrados e os demais
  vídeos continuam sem identificador. A apresentação “Vídeo confirmado” sem host foi conferida;
  reprodução, hospedagem e posição de um vídeo real não foram validadas.
- Há trabalho simultâneo da Etapa 03 em `scripts/importar-etapa3-sll.ts`,
  `src/features/sll/source-numbers.ts` e seu teste. Essas alterações foram preservadas e não
  integram o escopo desta entrega.

Arquivos desta etapa: as páginas `src/app/(member)/sll/page.tsx`,
`src/app/(member)/sll/comece-aqui/page.tsx` e `src/app/(member)/sll/aula/[lessonId]/page.tsx`;
`src/features/sll/components/sll-lesson-viewer.tsx`;
`src/features/sll/server/lesson-viewer.ts` e `progress-actions.ts`;
`src/features/sll/lesson-navigation.ts` e seu teste; `e2e/sll-welcome.spec.ts`;
`playwright.sll-welcome.config.ts`; este registro e `docs/DESIGN.md`. O schema e os IDs existentes
não foram alterados. O importador de boas-vindas foi reutilizado sem modificação.

### C. Evidências e roteiro

A conferência usa `playwright.sll-welcome.config.ts` e `e2e/sll-welcome.spec.ts`, com duas contas
temporárias `e2e-welcome-…@teste.com` na base **localhost:5433/lojaprontaprime**. A configuração
não executa o setup global que envia imagens ao bucket. Não há chamada paga nem escrita em
serviço externo. As contas, trilhas, aulas e mecanismo de falha temporários são removidos ao
terminar. O catálogo real continua em rascunho.

As imagens em `.data/sll-stage04-screens/welcome-<largura>-<tema>.png` são capturas da aplicação
real em `http://localhost:3001`, com catálogo temporário de teste contendo os títulos confirmados
do T01. Elas não comprovam publicação do conteúdo real. São viewports simuladas, sem teste em
aparelho físico. O player permanece indisponível.

Rotas do roteiro: `/sll/comece-aqui`, `/sll/comece-aqui?aula=<UUID>` e a rota antiga
`/sll/aula/<UUID>`. A sequência confere primeira, intermediária, última, ausência de vídeo,
recarga, Voltar, rascunho pela URL, salvamento, desmarcação, isolamento e navegação por teclado.
O caminho para `/sll/metodo` é oferecido apenas com o catálogo temporário publicado.

Capturas adicionais: `welcome-completed-1440-light.png` (uma aula concluída),
`welcome-track-completed-1440-light.png` (seis aulas e ação para o Método),
`welcome-390-more-contrast-light.png`, `welcome-390-more-contrast-dark.png`,
`welcome-390-forced-colors.png` e `welcome-unpublished-390-light.png` (estado que corresponde
ao catálogo real sem publicação). Somente o indicador de desenvolvimento do Next é ocultado
nas capturas; os componentes da aplicação permanecem visíveis.

### D. Verificações

| Verificação                      | Escopo                                                                   | Resultado                    | Evidência ou limitação                                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck                        | Workspace atual                                                          | Aprovado                     | `bun run typecheck`                                                                                                                                   |
| Lint                             | Workspace atual                                                          | Aprovado                     | `bun run lint`                                                                                                                                        |
| Testes unitários                 | `src`                                                                    | Aprovado                     | 231 testes, 39 arquivos; inclui alterações simultâneas da Etapa 03                                                                                    |
| Design-guard                     | Tokens, fontes e cores                                                   | Aprovado                     | Incluído em `bun test src`; teste não alterado                                                                                                        |
| Diferenças                       | Escopo e espaços                                                         | Aprovado                     | `git diff --check`; trabalho da Etapa 03 identificado separadamente                                                                                   |
| Navegador                        | Trilha, acesso direto, recarga, Voltar, estado indisponível e Método     | Aprovado                     | 6 cenários Playwright, 1,1 minuto, servidor local 3001                                                                                                |
| Persistência e isolamento        | Duas contas temporárias                                                  | Aprovado                     | Conclusão/desmarcação após recarga; progresso de uma conta não aparece na outra; unicidade da gravação                                                |
| Falha e recuperação              | Aula em rascunho e falha real de banco                                   | Aprovado                     | Guarda recusa envio adulterado; falha de escrita conserva dados e permite repetir                                                                     |
| Sem JavaScript                   | Conclusão e navegação                                                    | Aprovado                     | Contexto com JavaScript desligado; formulário real e recarga                                                                                          |
| Responsividade e axe             | 320, 390, 768, 1024, 1280 e 1440px; claro e escuro                       | Aprovado                     | 12 combinações; sem rolagem horizontal; lista ao lado a partir de 1280px                                                                              |
| Preferências                     | Grande/Maior e Mais contraste nos dois temas, em 390px                   | Aprovado                     | Axe e ausência de rolagem horizontal; capturas de contraste aumentado                                                                                 |
| Teclado                          | Navegar por Enter, foco de chegada, abrir menu, Escape e retorno de foco | Aprovado                     | Menu modal auditado pelo axe antes da simulação de forced-colors                                                                                      |
| Alto contraste e menos movimento | Emulação Chromium, 390px                                                 | Aprovado no escopo conferido | Captura inspecionada; no forced-colors o axe lê cores originais do tema, então contraste é conferido visualmente e as demais regras permanecem ativas |
| Console                          | Sequência principal                                                      | Aprovado                     | Nenhum `pageerror`; a falha de banco provocada no cenário próprio é esperada                                                                          |
| Limpeza da conferência           | Contas, conteúdo e função de falha temporários                           | Aprovado                     | Removidos ao terminar; seis aulas reais continuam em rascunho                                                                                         |
| Vídeo real                       | Reprodução e posição                                                     | Bloqueado                    | IDs do Passo 1 confirmados no inventário; host do player e reprodução ainda não validados                                                             |
| Leitor de tela manual            | NVDA ou equivalente                                                      | Não executado                | Axe e teclado não substituem a leitura manual                                                                                                         |
| Build de produção                | `.next` compartilhado                                                    | Não executado                | Servidor de outro trabalho utiliza esse diretório; verificação não exigida pelo AGENTS.md                                                             |
| Conta da referência              | Inspeção atual                                                           | Não executado                | Aba pertence à outra conversa; títulos e ordem vieram do inventário T01 local                                                                         |

### E. Rastreabilidade

As anotações originais não têm IDs individuais publicados no repositório. O registro existente
R06 é preservado; os números 4.x abaixo são requisitos da etapa, não IDs antigos inventados.

| Registro      | Origem                                     | Classificação            | Estado e evidência                                                                                         |
| ------------- | ------------------------------------------ | ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| R06 / 4.3–4.5 | Plano existente e Etapa 4                  | Mudança desejada         | Visualizador comum, sequência lateral a partir de 1280px e sequência abaixo no celular; conferir capturas. |
| 4.1–4.2       | Inventário T01                             | Confirmado no inventário | Seis títulos e ordem importados; publicação real pendente.                                                 |
| 4.6–4.7       | Etapa 4 e anotação sobre destinos internos | Mudança desejada         | Links mantêm a trilha, recarga e Voltar; roteiro de navegação.                                             |
| 4.8           | Etapa 4                                    | Dependência de conteúdo  | Aviso compacto implementado; reprodução de vídeo real não validada.                                        |
| 4.9–4.11      | Etapa 4 e anotação sobre aula concluída    | Mudança desejada         | Persistência, anúncio, isolamento e desmarcação pelo fluxo existente; roteiro funcional.                   |
| 4.12          | Anotação sobre rolagem desnecessária       | Mudança desejada         | Caminho para o Método junto das ações, sem diminuir fonte ou ocultar lista.                                |
| 4.13          | Etapa 4                                    | Verificação requerida    | Roteiro inclui falha real de escrita, aula em rascunho e formulário sem JavaScript.                        |

### F. Pendências

1. **Conteúdo/publicação:** a administradora precisa revisar e publicar a trilha, seus grupos e
   aulas pelo fluxo existente. A execução não troca o rascunho real por conteúdo de teste.
2. **Integração externa:** falta a disponibilidade real dos seis vídeos e a hospedagem definida.
3. **Decisão comercial:** nenhuma decisão nova necessária nesta etapa.
4. **Decisão de design:** nenhuma mudança adicional proposta; confirmar o resultado dentro da
   moldura existente. Não foi atribuída aprovação do dono por ausência de resposta.
5. **Ambiente:** servidor existente em 3001 reaproveitado; o servidor de 3000 já estava em uso.
   Nenhum dos servidores de outro trabalho foi encerrado.
6. **Verificação adicional:** leitor de tela manual e reprodução de vídeo não executados. A
   compilação de produção não foi executada sobre o `.next` usado pelo servidor de outro trabalho.

### G. Revisão

Conferir os títulos, seleção da aula, progresso, aviso de vídeo, conclusão e disposição móvel
nas capturas e o catálogo importado em rascunho no admin. A próxima etapa obrigatória descrita no
prompt é a **Etapa 05**; ela não foi iniciada. A Etapa 04 aguarda revisão, sem declarar o conteúdo
real publicado ou os vídeos operacionais.
