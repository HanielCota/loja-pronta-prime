# Vídeo de apresentação

O vídeo da Loja Pronta Prime, feito com [Remotion](https://www.remotion.dev) (vídeo escrito em
React). Sai em dois formatos, com as mesmas cenas: **16:9** (1920×1080, página de vendas e YouTube) e
**9:16** (1080×1920, Reels, Stories e TikTok). 68 segundos, 30 quadros por segundo.

## O que tem

- **Narração:** uma fala por cena, com a voz da OpenAI (`scripts/make-voice.ts`, modelo
  `gpt-4o-mini-tts`, voz `coral`). Cada fala passa por um tratamento de locução (compressor e
  volume no ponto). Os arquivos ficam em `public/voice` e o tempo de cada palavra, tirado da
  transcrição da própria fala, em `src/voice.json`: os dois vão pro repositório, pra o render não
  depender da API.
- **Legendas:** o título de cada cena em cima e, embaixo, a legenda da fala, com as palavras
  acendendo junto com a voz. Nas cenas em que a tela já mostra a frase em letra grande (o logo, a
  promessa, o final), a legenda da fala não aparece. O `.srt` leva a narração inteira.
- **Música de fundo:** pop leve e quente (piano elétrico, violão dedilhado, baixo e bateria bem
  macia), que abaixa sozinha enquanto a voz fala (`Video.tsx`). Edição no meio-termo: transições
  suaves, whoosh nas trocas de tela e um zoom leve em cada toque.
- **O app de verdade:** as telas são redesenhadas com as mesmas classes e tokens do app (o
  `globals.css` é importado direto), e os dados vêm das funções do próprio app: as ideias de nome
  (`nameSuggestions`), as sugestões e o rascunho do logo (`studioSuggestions`, `draftOf`), as
  barras do caminho (`storeStages`) e o rosto do mascote (`face.ts`). Mudou o app, o vídeo acompanha.
- **Trilha e efeitos próprios:** sintetizados em `scripts/`. Sem banco de sons, sem licença pra
  conferir.
- **Honesto com o produto:** as aulas e as ferramentas do SLL aparecem disponíveis, como na
  entrega de 7 de outubro de 2026. O que depende da conexão com a Shopee continua "em breve",
  e o rascunho do logo diz que a IA desenha a versão final.

## Roteiro

| Tempo  | Cena e fala                                                                             |
| ------ | --------------------------------------------------------------------------------------- |
| 0–8s   | As dúvidas em volta do mascote. "Quer vender na Shopee, mas não sabe por onde começar?" |
| 8–14s  | O mascote e a marca. "Calma. Agora tem um caminho: a Loja Pronta Prime."                |
| 14–20s | A promessa. "Você monta a sua loja na Shopee, um passo de cada vez."                    |
| 20–28s | A conversa inicial. "Começa com uma conversa rápida: uma pergunta por tela."            |
| 28–34s | O nome. "Com as suas respostas, a plataforma sugere nomes pra sua loja."                |
| 34–44s | O estúdio do logo. "Depois, você monta o seu logo e vê o rascunho mudar na hora."       |
| 44–52s | O caminho avança pra etapa 3. "E você sempre sabe em que etapa está."                   |
| 52–60s | A área do SLL. "Prefere estudar no seu ritmo? Tem o curso SLL."                         |
| 60–68s | O fecho e o endereço. "Loja Pronta Prime. Sua loja na Shopee começa aqui."              |

## Vídeo curto: o app no celular (30 segundos)

A composição `Celular30s` (1080×1920, 30 segundos) mostra só o app num celular, sem narração.
O título de cada cena conta a história, então o vídeo funciona também sem som (como a maioria
assiste no feed).

- **Celular em 3D:** ele sobe girando até ficar de frente, balança de leve o tempo todo e desce no
  fim. A câmera chega perto do logo quando ele muda (`src/reel/phone-stage.tsx`).
- **As mesmas telas do vídeo longo** (`src/screens/`), mais a área no primeiro acesso
  (`abertura.tsx`), com os toques no tempo da música.
- **Trilha ambiente** (`scripts/ambient.ts`, sai em `public/audio/ambiente.wav`): colchão, piano
  elétrico leve, ar de fundo e um sininho a cada troca de tela; resolve num acorde maior no
  fecho. Sem bateria: o som dos toques faz o ritmo.
- **Efeitos:** toque, passagem de tela, brilho do logo, "deu certo" na etapa nova e o celular
  chegando e saindo (os mesmos de `scripts/sfx.ts`).

| Tempo    | Cena                                                      |
| -------- | --------------------------------------------------------- |
| 0–2,5s   | O celular chega; ela toca em "Começar a conversa".        |
| 2,5–10s  | A conversa: escolhe três categorias e o tempo por semana. |
| 10–15s   | O nome: toca numa ideia e continua.                       |
| 15–22s   | O estúdio do logo: desenho, cores, letra e fundo.         |
| 22–27,5s | A marca fica pronta e o caminho avança pra etapa 3.       |
| 27,5–30s | O fecho com o mascote e o endereço.                       |

Tempo e títulos em `src/reel/timeline.ts`. Mudou o tempo? Rode `bun run audio`.

```bash
bun run audio && bun run render:celular   # out/loja-pronta-prime-celular-30s.mp4
bun run docker:celular   # o mesmo, pelo Docker (nesta máquina)
```

## Comandos

Rode de dentro desta pasta (`video/`). Precisa do `bun install` da raiz também (o vídeo importa o
`globals.css` e funções de `src/`).

```bash
bun install
bun run studio        # abre o Remotion Studio no navegador, pra ver e ajustar
bun run audio         # gera a trilha e os efeitos (public/audio); rode ao mudar src/timeline.ts
bun run test          # confere a duração do vídeo curto e a integridade da trilha ambiente
bun run voice         # gera as falas que faltam (OpenAI, custa centavos); --force refaz todas
bun run srt           # gera out/loja-pronta-prime.srt
bun run render        # os três MP4 em out/ (precisa do ffmpeg do Remotion; ver abaixo)
```

### Render pelo Docker (nesta máquina)

A política de integridade do Windows desta máquina bloqueia executáveis sem assinatura, e isso
inclui o ffmpeg e o compositor que o Remotion usa pra montar o MP4. O Studio funciona (roda no
Node e no navegador), mas o render é feito num Linux pelo Docker:

```bash
bun run docker:build  # uma vez
bun run docker        # instala as dependências no container e renderiza os três MP4
```

Os arquivos saem em `video/out/`. Pra conferir só alguns quadros (mais rápido que o vídeo todo),
dentro do container: `bun scripts/stills.ts 600 1100` (saem em `out/stills/`).

## Onde mexer

- **Tempo, títulos e falas:** `src/timeline.ts` (cenas em compassos, títulos, narração). Mudou
  uma fala? Apague o arquivo dela em `public/voice` e rode `bun run voice`. Mudou o tempo das
  cenas? Rode `bun run audio` pra a música acompanhar.
- **Cenas:** `src/scenes/` (abertura, o app em uso, o fecho) e `src/screens/` (as telas do app).
- **Som:** `scripts/music.ts` (a trilha), `scripts/sfx.ts` (os efeitos), `scripts/instruments.ts`.
- **Visual:** o mesmo do app (`docs/DESIGN.md`). Cor só pelos tokens; as exceções são desenhos (o
  mascote, o logo da aluna, a seta do mouse).
