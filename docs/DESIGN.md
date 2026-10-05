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
- `Avatar` mostra a foto privada do perfil, com as iniciais de reserva. A foto é ajustada para o
  círculo no envio. Em Perfil, adicionar, trocar e remover ficam na linha "Foto de perfil", com o
  mesmo formulário expansível dos outros ajustes; o campo de arquivo tem rótulo e ajuda visíveis
  e funciona sem JavaScript.
- Mascote (`components/brand/mascot`), `Logo`, `BrandCard`, `CardHeading`. O mascote cochila
  depois de 10s sem mexer (com "Zzz"), mas só nas telas de acesso: onde ele faz a pergunta
  (`MascotBubble`) ou acompanha a leitura (painel da loja), use `canSleep={false}`.
- Molduras de tela:
  - `PageShell` + `BrandCard`: telas de acesso (entrar, senha), cartão centralizado com o mascote
    no topo.
  - `AreaShell`: as áreas (Loja Pronta, SLL, perfil), largura 1040px.
  - `CenteredMemberPage`: telas de dentro com o conteúdo no meio (fim da conversa, marca pronta,
    Shopee).
  - `ConversationLayout`: os passo a passo (conversa, marca), com "Voltar", "Terminar depois" e a
    barra de progresso.
  - `MascotBubble` (a pergunta em destaque), `StickyAction` (o botão preso embaixo no celular),
    `FocusOnArrival` (foco no título ao chegar).
- Opções de escolha: `optionFocus` / `optionChecked` (`question/option-styles.ts`).
- No estúdio do logo, a barra acompanha a numeração: a etapa atual e as anteriores ficam azuis;
  avançar não apaga o progresso já mostrado. Sugestões nas etapas futuras não antecipam a barra.
- Na pergunta de cor, a seleção é indicada por um aro azul fino e um check na amostra, sem contornar
  o cartão. Ao abrir “Outra cor”, a opção anterior é desmarcada e o mesmo aro aparece na amostra
  redonda, indicando o seletor aberto; a resposta é marcada só depois da escolha, quando a amostra
  mostra a cor real. Tocar de novo na cor marcada remove a seleção. O painel usa a superfície neutra
  do tema, e “Limpar cor” é um botão secundário contornado.
- Ícones: `lucide-react`, sempre com `aria-hidden="true"` quando há texto junto.
- Nas telas de dentro, o cabeçalho tem um botão de tema de 44px ao lado da conta: a lua acompanha o
  escuro e o sol acompanha o claro; tocar alterna para o outro tema. Ele usa a mesma preferência
  local dos ajustes em Perfil; a pessoa ainda pode escolher "Automático" ou ajustar o tema escuro
  por lá.

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
  1040px.

### Já foram testados e recusados (não proponha de novo)

- Tela de entrada dividida (painel azul da marca ao lado do formulário).
- Cartão de duas colunas no login (mascote e título à esquerda, formulário à direita).
- Mascote "encostado" na borda do cartão. O mascote fica dentro do cartão, centralizado no topo.
- Paleta antiga roxa sobre bege (era do "Escala Shop"). A marca é Loja Pronta Prime.
- Preto puro no tema escuro (o escuro é grafite).

## Acessibilidade (obrigatória, não opcional)

- Tudo pelo teclado, com foco visível (`focus-visible:outline-2 outline-ring outline-offset-2`).
- Alvos de toque com pelo menos 44px (`min-h-11`).
- `prefers-reduced-motion`: animação some (`motion-reduce:...`, `motion-safe:...`).
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
