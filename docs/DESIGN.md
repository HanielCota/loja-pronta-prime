# Design da Loja Pronta Prime

O visual do app é decidido. Este guia existe pra quem mexe no código (gente ou IA) **seguir o que
já existe**, não reinventar. Na dúvida, copie o padrão de uma tela parecida que já existe.

Mudar qualquer coisa daqui (cor, letra, raio, padrão de tela) é decisão do dono do produto, não de
quem está implementando. O teste `src/design-guard.test.ts` falha se os pontos principais mudarem.

## A direção: estilo Apple

Inspirado no iCloud e no Apple ID: fundo cinza bem claro, cartões brancos com cantos grandes e
sombra difusa, um azul só pra ação, muito espaço em branco, letra grande. Calmo e simples, porque
o público é muito iniciante (muitas alunas mal usam o computador).

## Cores: só pelos tokens

As cores ficam em `src/app/globals.css` (claro em `:root`, escuro em `.dark`) e viram classes do
Tailwind. **Nunca** use cor solta (`#0071e3`, `bg-white`, `text-gray-500`, `bg-[#...]`): ela quebra
o tema escuro e o alto contraste.

| Classe                                     | Pra quê                                         | Claro              | Escuro                           |
| ------------------------------------------ | ----------------------------------------------- | ------------------ | -------------------------------- |
| `bg-background`                            | Fundo da página                                 | `#f5f5f7`          | `#1f1f22` (grafite, nunca preto) |
| `bg-card`                                  | Cartões                                         | `#ffffff`          | `#2a2a2e`                        |
| `text-foreground`                          | Texto principal                                 | `#1d1d1f`          | `#f5f5f7`                        |
| `text-muted-foreground`                    | Texto de apoio                                  | `#515155`          | `#aeaeb2`                        |
| `bg-primary` / `text-primary-foreground`   | O botão principal                               | `#0071e3` / branco | igual                            |
| `bg-primary-soft`                          | Botão secundário, opção escolhida, avisos leves | `#e8f2fd`          | `#163a63`                        |
| `text-link`                                | Links e ações de texto                          | `#0066cc`          | `#5aabff`                        |
| `bg-muted`                                 | Realce, hover                                   | `#f5f5f7`          | `#36363b`                        |
| `text-destructive` / `bg-destructive-soft` | Erros                                           | `#d70015`          | `#ff8077`                        |
| `bg-progress` / `text-progress-text`       | Progresso, feito, "Sugestão"                    | verde              | verde                            |
| `border-border` / `border-input`           | Linhas / borda de campo                         |                    |                                  |
| `outline-ring`                             | Anel de foco                                    | azul               | azul claro                       |
| `bg-segment` / `bg-segment-thumb`          | Controle segmentado (abas tipo iOS)             |                    |                                  |

- **Um azul só**, pra ação. Nada de roxo, gradiente ou segunda cor de destaque.
- Todo contraste confere WCAG AA nos dois temas (os comentários do `globals.css` dizem os valores).
  Cor nova só com contraste conferido, e entra como token nos dois temas.
- Exceções com motivo (desenhos, não a interface): o mascote, as amostras de cor, o rascunho do
  logo, a bandeira do Brasil no WhatsApp. Estão na lista do `design-guard.test.ts`.

## Letras

- **Manrope** pro texto e **Inconsolata** só pra código (`src/app/layout.tsx`). Nunca Inter ou
  outra fonte de interface. As letras da marca (`src/features/brand/fonts.ts`) são só pro nome da
  loja e pro logo.
- Tamanhos do tema: `text-body` (17px, o texto normal), `text-sm` (16px, o **menor** permitido:
  dicas, erros, rótulos), `text-title` / `text-title-lg` / `text-title-xl` (títulos, com tracking
  negativo). Nada abaixo de 16px na tela (exceção: etiquetas `text-xs` em maiúsculas, decorativas).
- **Normal** é o padrão e o menor tamanho do texto: Perfil só oferece aumentar (Grande, Maior), e
  nenhuma tela reduz o texto por conta própria.
- Títulos com `text-balance`; parágrafos com `text-pretty`.

## Forma

- Cartões: `rounded-card` (28px) + `bg-card` + `shadow-card`, e
  `forced-colors:border forced-colors:border-[CanvasText]` (no alto contraste, a sombra some).
  Use `panelCard` (`features/member/components/area-shell.tsx`) quando servir.
- Botões, chips e controles segmentados: `rounded-full`.
- Peças dentro de cartões (miniaturas, opções grandes): `rounded-2xl` / `rounded-3xl`.
- Campos: `rounded-field` (12px), com rótulo flutuante (`FloatingLabelInput`).
- Sombra: só `shadow-card`. Nada de `shadow-lg` ou sombras inventadas.

## Componentes que já existem (use, não recrie)

- `Button` (`components/ui/button.tsx`): `default` (azul, a ação principal), `soft` (azul claro,
  secundária), `ghost`, `link`. Tamanhos `default` (altura mínima 48px, largura toda), `inline`,
  `icon`. Tem `loading` com texto ("Salvando…").
- `FloatingLabelInput`, `PasswordInput`, `Field`/`FieldError`, `Switch`, `Avatar`, `Spinner`,
  `LiveRegion` (`components/ui`).
- Nada com a cara padrão do navegador. Lista de escolha: `Select` (o `<select>` nativo com a
  borda, o fundo e o foco dos campos e a seta do lucide). Texto longo: `Textarea` (mesmo visual,
  cresce com o texto, sem o puxador onde o navegador permite). Arquivo: `FileField` (botão `soft`
  "Escolher arquivo" e o nome e o tamanho embaixo; sem JavaScript, o campo do navegador). Caixa de
  marcar, rádio, número, busca e `<summary>` já têm estilo global no `globals.css`: borda dos
  campos, azul quando marcados, sem setinhas, sem o "x" da busca e sem o triângulo das seções.
  No alto contraste do Windows, caixa, rádio e a seta do `Select` voltam a ser os do sistema.
- `Avatar` mostra a foto privada do perfil, com as iniciais de reserva. A foto é ajustada para o
  círculo no envio. Em Perfil, adicionar, trocar e remover ficam na linha "Foto de perfil", com o
  mesmo formulário expansível dos outros ajustes; o campo de arquivo tem rótulo e ajuda visíveis
  e funciona sem JavaScript.
- Mascote (`components/brand/mascot`), `Logo`, `BrandCard`, `CardHeading`. O mascote cochila
  depois de 10s sem mexer (com "Zzz"; com a aba escondida, o relógio pausa), mas só nas telas de
  acesso: onde ele faz a pergunta (`MascotBubble`) ou acompanha a leitura (painel da loja), use
  `canSleep={false}`.
- Molduras de tela:
  - `PageShell` + `BrandCard`: telas de acesso (entrar, senha), cartão centralizado com o mascote
    no topo.
  - `AreaShell`: a Loja Pronta e o perfil. Largura 1040px (perfil, 688px); com menu lateral
    (`sidebar`), 1440px, com o menu de 240px à esquerda (`src/lib/member-layout.ts`).
  - `SllAreaShell`: o SLL, separado da Loja Pronta, como um painel (dashboard). Ver "Área SLL".
  - `AdminShell`: o admin, também como painel (dashboard). Ver "Painel admin".
  - `CenteredMemberPage`: telas de dentro com o conteúdo no meio (fim da conversa, marca pronta,
    Shopee).
  - `ConversationLayout`: os passo a passo (conversa, marca), com "Voltar", "Terminar depois" e a
    barra de progresso.
  - `MascotBubble` (a pergunta em destaque), `StickyAction` (o botão preso embaixo no celular),
    `FocusOnArrival` (foco no título ao chegar).
- Opções de escolha: `optionFocus` / `optionChecked` (`question/option-styles.ts`).
- No estúdio do logo, a barra acompanha a numeração: a etapa atual e as anteriores ficam azuis;
  avançar não apaga o progresso já mostrado. Sugestões nas etapas futuras não antecipam a barra.
- A prévia do logo pronto inclui uma imagem ilustrativa do kit de envio (caixa, adesivo e sacola),
  com o logo sobreposto e identificado como exemplo. As proporções acompanham a largura do cartão.
  A fonte sugerida na conversa entra no estúdio apenas quando ainda não existe uma escolha salva.
- Na pergunta de cor, a seleção é indicada por um aro azul fino e um check na amostra, sem contornar
  o cartão. Ao abrir “Outra cor”, a opção anterior é desmarcada e o mesmo aro aparece na amostra
  redonda, indicando o seletor aberto; a resposta é marcada só depois da escolha, quando a amostra
  mostra a cor real. Tocar de novo na cor marcada remove a seleção. O painel usa a superfície neutra
  do tema, e “Limpar cor” é um botão secundário contornado.
- Ícones: `lucide-react`, sempre com `aria-hidden="true"` quando há texto junto.
- Escolher arquivo (a foto do perfil): nada do campo cinza do navegador. Uma prévia redonda de
  como vai ficar, um botão `soft` "Escolher foto" (que é o rótulo do campo de arquivo, escondido
  com `sr-only`) e o nome e o tamanho do arquivo embaixo. Sem JavaScript, aparece o campo do
  navegador, que já envia sozinho.
- Nas telas de dentro, o cabeçalho tem um botão de tema de 44px ao lado da conta: a lua acompanha o
  escuro e o sol acompanha o claro; tocar alterna para o outro tema. Ele usa a mesma preferência
  local dos ajustes em Perfil; a pessoa ainda pode escolher "Automático" ou ajustar o tema escuro
  por lá.
- Quem tem os dois produtos troca de área pelas **abas da barra do topo** (navbar tradicional):
  “Minha loja” e “Curso SLL” (o campo `tab` do catálogo, pra não repetir a marca ao lado), com
  ícone, depois de uma linha vertical curta que as separa da marca. A da vez fica em
  `text-foreground`, com o ícone `text-link` e um traço `bg-primary` de 3px, de pontas redondas,
  por cima da linha da barra; as outras em `text-muted-foreground`. No celular e no tablet
  (abaixo de 1024px), as abas descem pra uma segunda linha da barra. Nada de seletor segmentado acima do
  título. Fora das áreas (perfil), a trilha continua levando à escolha. No SLL, no computador, a
  troca fica no pé do menu lateral ("Ir pra Minha loja"); no celular e no tablet, são as mesmas
  abas.
- A linha de baixo da barra do topo é fina (1px, `border-border`).
- Nas áreas (`AreaShell`), do tablet pra cima, a barra fica **presa no topo** ao rolar, com fundo
  `bg-background/80` desfocado; com "Mais contraste" ou menos transparência no aparelho, o fundo
  fica sólido (variante `opaque:`). No celular ela rola junto. O que também fica preso nessas
  telas usa `top-22`, logo abaixo dela, e o `scroll-padding-top` evita foco escondido atrás da
  barra.
- O tema padrão é o **claro**, com o "Automático" desligado, mesmo com o aparelho no escuro. O
  escuro e o automático só valem quando ela escolhe (no perfil ou no botão do cabeçalho).
- Perfil, Aparência, depois do tema: **Tamanho do texto** (Normal, Grande, Maior, num controle
  segmentado de rádios), **Reduzir animações** e **Mais contraste** (chaves). Valem na hora, só no
  aparelho, e viram atributos no `<html>` (`data-text`, `data-motion`, `data-contrast`) que um
  script do head põe antes da página aparecer. O tamanho muda a base do `rem`, então use `rem`
  (as classes do Tailwind), não `px`, pra o que deve crescer junto.

## Padrões de tela

- **Uma decisão por tela.** Título grande com a pergunta ou o que fazer, uma linha de ajuda, as
  opções, e um botão principal. Nada de várias ações competindo.
- No estúdio do logo, a alternativa escrita fica visível abaixo das opções. O campo diz “Escreva do
  seu jeito”, inclui um exemplo no placeholder e um botão “Usar essa ideia”; não fica escondido atrás
  de um link. “Usar essa ideia” compartilha o azul de ação com “Continuar”, mas permanece compacto ao
  lado do campo; fica desativado enquanto estiver vazio.
- No estúdio do logo, os botões “Voltar” das etapas de escolha e do resumo usam formato de pílula,
  contorno `border-border` e texto `text-link`.
- O botão principal fica embaixo, largura toda no celular (`StickyAction` nos passo a passo).
- Lista longa (a revisão das respostas): uma seta redonda (`ScrollHint`) embaixo, no centro, avisa
  que tem mais. Pula 3 vezes e para; some perto do fim; tocar rola um pedaço. Fica fora do Tab e do
  leitor de tela.
- Toque: resposta no instante (`active:scale-[0.97]`, 100 a 150ms). Escolher uma opção só marca a
  resposta; a pessoa confirma no botão principal, também pelo teclado.
- Larguras: acesso 480 a 640px; passo a passo 560 a 680px (mais largo no estúdio do logo); áreas
  1040px; SLL: menu lateral de 288px e conteúdo até 1200px.

### Área SLL

- A referência visual conferida em 6 de outubro de 2026 está em
  `docs/SLL-REFERENCIA-VISUAL.md`. A composição vem do SLL anterior; cores, letras, moldura e
  componentes continuam sendo os da Loja Pronta Prime. Esta adaptação se limita ao SLL.
- O SLL tem moldura própria (`SllAreaShell`), separada da Loja Pronta: um painel (dashboard). No
  computador, **sem barra no topo**: um menu lateral fixo de 288px, de ponta a ponta na altura da
  tela (`bg-card` com linha à direita), com a marca e o tema no topo, as seções no meio e, no pé,
  "Ir pra Minha loja" (quem tem os dois produtos) e a conta (foto, nome e email; o menu abre pra
  cima). O conteúdo começa no alto, à direita, até 1200px. No celular, volta a barra do topo de
  sempre (com as abas das áreas) e as seções abrem pelo controle “Seções do SLL”, acima do título.
  O conteúdo usa os tokens, a fonte, os cartões e os botões deste projeto.
- O menu mostra Painel, Minhas Lojas, Comece aqui, Método, etapas publicadas, Recursos e Cursos
  complementares. A seção atual fica identificada; etapas em rascunho não viram links para alunas.
- No computador, o menu lateral fica parado enquanto o conteúdo rola. As etapas aparecem quando
  a aluna está no Método; se as seções não couberem na altura, só a lista do meio rola. Rótulos de 16px e alvos de 44px deixam os destinos à vista em telas comuns.
  No celular, o controle mostra a seção atual e volta fechado ao navegar, para deixar
  o conteúdo à vista.
- A aula usa vídeo em proporção 16:9 à esquerda e sequência à direita a partir de 1280px;
  em larguras menores, as colunas se empilham para manter a leitura. A aula atual fica numerada
  em azul e visível na lista, que acompanha a rolagem no computador. Anterior/próxima ficam acima do botão
  de conclusão, que ocupa a largura do cartão. Sem vídeo disponível, um aviso compacto diz
  “Vídeo em breve”, sem reservar uma área vazia de player.
- O vídeo usa o player Panda da conta conferida, com início apenas ao tocar em reproduzir.
  O mesmo player aparece nas prévias do admin. O campo “Link ou ID do vídeo Panda” aceita o
  endereço do player ou seu ID; o servidor confere o endereço e salva somente o ID.
- As etapas têm cartões com altura determinada pelo conteúdo e progresso real. Um passo da Etapa 1 abre a lista
  de aulas; o passo da aula a retomar começa aberto. Prioridades da Etapa 2 usam seta para baixo,
  que vira ao abrir as instruções. A Biblioteca usa busca e cartões por categoria, em uma coluna
  no celular e até três no computador, com conclusão e ação visíveis.
- Cartões de etapas, cursos e biblioteca usam largura mínima de 18rem quando há espaço;
  no celular, cabem na largura disponível. Seus títulos usam `text-xl` (20px), abaixo do título
  da página, e o preenchimento é de 20px. As classes de preenchimento são combinadas com `cn`
  para substituir as da moldura. Os cartões não esticam para igualar alturas nem empurram ações
  com margens automáticas. Nada de cortar títulos ou descrições para caber na grade.
- O caminho de retorno fica antes do título nas etapas, cursos e aulas. A última aula oferece
  “Voltar às aulas”. O teclado tem o atalho “Pular para o conteúdo”, exclusivo do SLL.
- A busca da Biblioteca ignora acentos e maiúsculas, oferece contagem e limpeza e mantém a
  busca confirmada no endereço. O formulário GET também funciona sem JavaScript.
- No painel, o caminho de aprendizagem aparece antes do aviso de lojas. Em Recursos, os cartões
  usam sua altura natural; links externos anunciam a abertura em outra aba.
- Cursos complementares têm destaque amplo e biblioteca em cartões com contagem e progresso
  individuais. Sem o arquivo da capa, aparece um aviso neutro compacto “Capa em breve”, sem imagem
  inventada nem coluna reservada. Capas reais mantêm proporção 16:9. A lista do curso mantém
  numeração, duração e progresso.
- No catálogo e na lista de um curso, a contagem considera todas as aulas publicadas, inclusive
  as opcionais. A regra de progresso principal continua controlando o desbloqueio das etapas.
  Mensagens de conclusão e erro usam `LiveRegion` sempre acessível; o texto visível só aparece
  quando há mensagem, sem reservar espaço vazio nem esconder o anúncio com `display: none`.
- O banner tem chamada grande e imagem ao lado no computador; no celular, os elementos se
  empilham. A troca é manual, com setas e marcadores que têm alvos de 44px e nomes acessíveis.
  Banners em rascunho continuam fora do painel da aluna.
- Em Recursos, a calculadora sem fórmula validada aparece como aviso compacto “Em breve”. As
  ferramentas externas dizem o que fazem e mostram uma ação específica, com cartões de altura
  determinada pelo conteúdo.

### Painel admin

- Moldura própria (`AdminShell`), com a mesma composição do SLL: no computador, **sem barra no
  topo**, menu lateral fixo de 288px de ponta a ponta (`bg-card` com linha à direita), com a marca
  e o tema no alto, as seções no meio (Painel, Contas e compras, Conteúdo das alunas) e, no pé,
  "Ver a área das alunas" e a conta. O conteúdo vai até 1400px. No celular, volta a barra do topo
  e as seções abrem por "Seções do painel", acima do título. O que fica preso ao rolar usa
  `top-10`. A seção atual fica em `bg-primary-soft` com texto `text-link`.
- As ações do admin têm ícones lucide junto do texto: salvar, editar, adicionar, publicar,
  descartar, restaurar e arquivar; arquivar usa o ícone de caixa de arquivo, sem lixeira.
  Os selects do admin abrem uma lista com a superfície do painel, hover, foco e check na opção
  marcada. Mantêm o campo nativo como reserva antes da hidratação e sem JavaScript.
  Confirmações de conteúdo usam uma janela do painel com título, descrição e Cancelar, com foco
  preso e devolvido à ação ao fechar. O email completo no pé do admin usa uma dica estilizada
  ao passar o mouse ou focar pelo teclado. Os erros de formulário aparecem nos avisos e campos
  do painel, validados no servidor, sem os balões nativos. Estes ajustes ficam restritos ao admin.
- No menu do admin, "Conteúdo das alunas" (o grupo mais longo) abre e fecha pelo título, com a
  seta que gira, e lembra a escolha no aparelho; abre sozinho quando a página atual é dele.
  "Online agora" mostra quantas pessoas estão online (ponto verde e número numa pílula
  `bg-muted`), atualizado a cada 30s. Os cursos aparecem só como "Cursos" no menu, pra caber numa
  linha. O email no pé mostra o endereço inteiro ao passar o mouse.
- Nos menus laterais fixos (admin e SLL), a lista que não cabe na altura esmaece a borda que tem
  itens escondidos (`ScrollFade`), do tamanho do que está escondido, até 2,5rem: avisa que tem
  mais mesmo onde a barra de rolagem não aparece. As barras de rolagem do app são finas, na cor
  `--track`, sem as setas do Windows.
- `/admin` abre a **Visão geral**: seis cartões de número (contas, novas na semana, com SLL, com
  Loja Pronta, compras ativas, bloqueadas), cada um levando à tela que o detalha, com rótulo,
  ícone num círculo `bg-primary-soft` e o número grande (`text-title-lg`, `tabular-nums`).
  Embaixo, três listas curtas (contas novas, acessos alterados, avisos da Hotmart) com "Ver ..."
  no canto. Sem gráficos por enquanto. Entre os números e as listas, "Online agora" ocupa a
  largura toda: quem está com a plataforma aberta, a área (etiqueta) e a página em palavras (na
  aula, o título). A Visão geral se atualiza sozinha a cada 30s.
- Online agora (`/admin/online`): a lista completa, em tabela (aluna, área, onde está, último
  sinal, aparelho), atualizada a cada 15s, com a contagem por tipo de aparelho embaixo do total. O
  aparelho tem ícone (celular, tablet, monitor) e o tipo escrito, e embaixo modelo, sistema e
  navegador. A tela de uma conta mostra o "Último acesso" no resumo e um cartão "Aparelho" com
  os detalhes que o navegador contou.
- Contas: tabela no computador (nome e email, produtos, situação, data), com a linha toda
  clicável e etiquetas `rounded-full` (produto em `bg-primary-soft`, bloqueada em
  `bg-destructive-soft`, o resto em `bg-muted`); no celular, a mesma informação em lista. A
  busca fica no cabeçalho do cartão. A tela de uma conta tem os formulários à esquerda e o
  resumo e o acesso à plataforma numa coluna de 400px à direita, presa ao rolar.
- Criar conta (`/admin/contas/nova`, botão principal no cabeçalho de Contas): um cartão de até
  672px com os campos, os produtos como opções grandes com caixa de marcar e o primeiro acesso
  como opções grandes com rádio; a senha temporária só aparece com essa opção marcada (por CSS,
  sem JavaScript). Depois de criar, a tela da conta mostra um aviso verde claro dizendo como ela
  vai entrar.
- No painel admin, cada nível de conteúdo abre o próximo, com “Voltar” para retornar. As ações
  frequentes ficam visíveis; publicação e arquivo ficam em “Mais opções”. Listas de conteúdo,
  materiais, banners e recursos podem ser ordenadas por arraste ou pelo teclado. O marcador tem
  rótulo, e os controles de subir/descer continuam disponíveis quando houver lista longa.
- Textos fixos da área Aprender ficam em grupos recolhíveis no admin. Títulos e descrições de
  aulas, etapas e cursos continuam nos próprios itens. Capas de cursos e imagens dos banners são
  enviadas pelo admin e ficam vazias até receber o arquivo original.
- Movimento breve apenas para orientar: mudança do banner, progresso e realce dos itens do menu.
  Use `motion-safe:` para respeitar o aparelho e o ajuste da aluna; nenhum conteúdo depende da
  animação para ser entendido.

## Movimento

- Uma curva só: `ease-fluid` (`cubic-bezier(0.22, 1, 0.36, 1)`), que sai rápido e assenta devagar,
  como uma mola sem balanço. Nada de quicar.
- **Troca de página:** ao navegar dentro do app, o conteúdo da página nova (o `<main>`, pelo
  `PageMain`) entra subindo 0,5rem e esmaecendo em 0,45s; a barra do topo e os menus laterais
  ficam parados. No primeiro carregamento e sem JavaScript, a página já chega parada. Todas as
  molduras usam o `PageMain`; tela nova com moldura própria também deve usar.
- **Seções recolhíveis** (`<details>`): abrem e fecham deslizando (altura e opacidade), onde o
  navegador consegue; nos outros, abrem na hora.
- **Troca de tema:** a tela inteira esmaece de um tema pro outro em 0,3s, sem piscar.
- **Realces:** cor de fundo, texto e borda de links e botões mudam em 150ms. Menus abrem e
  fecham com esmaecido e um leve zoom a partir do botão. Cartões clicáveis do painel encolhem
  de leve ao toque.
- **Reduzir animações** (perfil ou aparelho): a troca de página só esmaece, as seções e o tema
  trocam na hora. A animação termina sem deixar `transform` no `<main>`, pra não atrapalhar o
  que fica preso na tela (`fixed`).

### Já foram testados e recusados (não proponha de novo)

- Tela de entrada dividida (painel azul da marca ao lado do formulário).
- Cartão de duas colunas no login (mascote e título à esquerda, formulário à direita).
- Mascote "encostado" na borda do cartão. O mascote fica dentro do cartão, centralizado no topo.
- Paleta antiga roxa sobre bege (era do "Escala Shop"). A marca é Loja Pronta Prime.
- Preto puro no tema escuro (o escuro é grafite).

## Acessibilidade (obrigatória, não opcional)

- Tudo pelo teclado, com foco visível (`focus-visible:outline-2 outline-ring outline-offset-2`).
- Alvos de toque com pelo menos 44px (`min-h-11`).
- Menos movimento: o pedido do aparelho ou a chave do perfil. No CSS, use `motion-reduce:` e
  `motion-safe:` (as duas obedecem às duas fontes). No JavaScript, `prefersReducedMotion()` de
  `src/lib/reduced-motion.ts`, nunca `matchMedia` direto.
- Mais contraste (chave do perfil): tokens próprios em `globals.css`
  (`:root:not(.dark)[data-contrast='more']` e `:root.dark[data-contrast='more']`). Cor nova entra
  também nesses blocos, se ela for texto de apoio, borda ou link.
- Alto contraste do Windows: `forced-colors:` nos cartões, opções e botões.
- Formulários de verdade: funcionam sem JavaScript; erro com `role="alert"` ligado ao campo por
  `aria-describedby`.
- Leitor de tela: rótulos de verdade, `sr-only` pro que só o desenho mostra, `aria-live` só pro
  que muda e importa (sem anunciar a cada segundo).
- Toda tela nova passa no axe (os e2e usam `expectNoA11yViolations`).

## Texto

- Português do Brasil, simples e carinhoso, frases curtas, sem jargão ("pra", "você").
- Botão diz o que acontece: "Criar meu logo", "Continuar", "Usar o logo 1".
- A plataforma é automática: nada de "a equipe faz X".
- Nada de fingir: se algo ainda não funciona, a tela diz "em breve", sem botão que finge.
