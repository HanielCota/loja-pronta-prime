# Instruções pra IAs (Codex, Claude, Cursor, Copilot...)

Loja Pronta Prime: área de membros onde alunas iniciantes montam a própria loja na Shopee (Loja
Pronta) ou fazem o curso SLL. O produto está descrito em `docs/PRODUTO.md`.

Next.js (App Router) + React 19, Tailwind v4 com tokens no formato shadcn/ui, Drizzle + Postgres,
better-auth, Bun. Arquivos no bucket S3; imagem do logo pela OpenAI.

## Regra nº 1: não mude o design

O visual está decidido e documentado em **`docs/DESIGN.md`**. Leia antes de mexer em qualquer
tela. Em resumo, o que nunca muda sem pedido explícito do dono:

- Estilo Apple: fundo `#f5f5f7`, cartões brancos `rounded-card` (28px) com `shadow-card`, um azul
  só (`#0071e3`) pra ação, tema escuro em grafite (não preto).
- Cor **só pelos tokens** do `src/app/globals.css` (`bg-card`, `text-muted-foreground`,
  `bg-primary`...). Nada de `#hex`, `bg-white`, `text-gray-500` ou `bg-[#...]` na interface.
- Fonte Manrope (Inconsolata só pra código). Corpo 17px (`text-body`), nada abaixo de 16px.
- Botões `rounded-full` pelo componente `Button`; campos com `FloatingLabelInput`; ícones lucide.
- Use as molduras e componentes que já existem (lista no `DESIGN.md`). Não crie biblioteca de UI
  nova, não troque a moldura de uma tela, não "moderniza" o layout.
- Uma decisão por tela, texto simples. Padrões já recusados estão no `DESIGN.md`: não proponha de
  novo.

Pediram uma tela nova? Copie o padrão da tela existente mais parecida. Pediram pra mudar o visual?
Mude só o que foi pedido e atualize o `DESIGN.md` junto.

O teste `src/design-guard.test.ts` confere os tokens da marca, as fontes e as cores soltas. Se ele
falhar, a correção é voltar ao padrão, não mudar o teste (a não ser que o dono tenha pedido a
mudança de design).

## Acessibilidade e texto

- WCAG 2.2 AA nos dois temas: teclado, foco visível, alvos de 44px, `prefers-reduced-motion`,
  alto contraste (`forced-colors:`), leitor de tela. Formulários funcionam sem JavaScript.
- Português do Brasil simples, sem jargão, frases curtas. O público é muito iniciante.
- A plataforma é automática: nada de "a equipe faz". Nada de fake/mock: o que ainda não funciona
  aparece como "em breve", sem botão que finge.

## Código

- Siga o jeito do código ao redor: comentários em português dizendo o porquê, nomes claros.
- Código de servidor (`*/server/*`, banco, env) não vai pro navegador: o lint bloqueia. Mutações
  por Server Actions, conferindo acesso no servidor.
- Funções puras ficam fora de `server/` e têm teste (`*.test.ts` ao lado).
- Banco: mude `src/server/db/schema/*` e gere a migração com `bun run db:generate` (com nome).

## Comandos

```bash
bun install
bun run db:up && bun run db:migrate   # Postgres local (docker compose)
bun run dev                           # http://localhost:3000
bun run dev:aluna <email> <senha>     # aluna de teste (ver o script pras opções)
bun run typecheck && bun run lint && bun test src
bun run format                        # Prettier
bun run test:e2e                      # Playwright (usa a OpenAI e o bucket de verdade: custa centavos)
```

O vídeo de apresentação (Remotion) fica em `video/`, com o próprio `package.json`: ver
`video/README.md`.

Antes de entregar: typecheck, lint, testes e, em telas, abrir no navegador (celular e computador,
claro e escuro).

## Git

- Tudo em inglês: commits, branches, PRs. Conventional Commits (`feat(logo): ...`), corpo explicando
  o porquê, um assunto por commit, cada um passando no typecheck e no lint.
- Branch `type/short-description` a partir da `main` e PR pra `main`. Nunca commit direto na `main`.
- Sem linhas de coautoria de IA nos commits nem assinatura de IA nos PRs.
