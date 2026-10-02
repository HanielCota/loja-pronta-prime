# Loja Pronta Prime

Área de membros da Loja Pronta Prime — [lojaprontaprime.com](https://lojaprontaprime.com).

Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui, com Bun como runtime e gerenciador de pacotes.
Os scripts `dev`, `build` e `start` usam `bun --bun` para rodar o Next no runtime do Bun (e não no Node).

| Camada           | Tecnologia                                           |
| ---------------- | ---------------------------------------------------- |
| Autenticação     | Better Auth (email e senha, sessão em cookie)        |
| Banco            | PostgreSQL + Drizzle ORM                             |
| Formulários      | Conform + Zod (mesmo schema no navegador e servidor) |
| Limite de acesso | rate-limiter-flexible (contagem no Postgres)         |
| Testes           | Playwright (ponta a ponta, desktop e celular)        |
| UI               | shadcn/ui (Radix) + lucide-react                     |
| Lint / formato   | Oxlint / Prettier                                    |

## Como rodar (desenvolvimento)

Pré-requisitos: Bun e Docker.

```bash
bun install
cp .env.example .env.local   # preencha BETTER_AUTH_SECRET (instruções no arquivo)
bun run db:up                # sobe o Postgres local (docker-compose.yml)
bun run db:migrate           # cria as tabelas
bun run dev:aluna aluna@teste.com senha-teste-123   # cria uma aluna de teste
bun run dev
```

Acesse http://localhost:3000 (redireciona pro login em `/entrar`).

Não existe cadastro público: em produção, as contas serão criadas pela integração com a Hotmart.
Em desenvolvimento, o link de "Esqueci minha senha" aparece no terminal do `bun run dev`.

## Scripts

| Script                | Descrição                                                                |
| --------------------- | ------------------------------------------------------------------------ |
| `bun run dev`         | Servidor de desenvolvimento                                              |
| `bun run build`       | Build de produção                                                        |
| `bun run start`       | Servidor de produção                                                     |
| `bun run lint`        | Oxlint                                                                   |
| `bun run lint:fix`    | Oxlint com correção automática                                           |
| `bun run format`      | Prettier                                                                 |
| `bun run typecheck`   | Checagem de tipos (`tsc --noEmit`)                                       |
| `bun run db:up`       | Sobe o Postgres de desenvolvimento (Docker)                              |
| `bun run db:down`     | Para o Postgres de desenvolvimento                                       |
| `bun run db:generate` | Gera migração a partir do schema Drizzle                                 |
| `bun run db:migrate`  | Aplica as migrações                                                      |
| `bun run db:studio`   | Abre o Drizzle Studio                                                    |
| `bun run auth:schema` | Regenera o schema das tabelas do Better Auth                             |
| `bun run dev:aluna`   | Cria aluna de teste: `<email> <senha> [--nao-confirmada] [--desativada]` |
| `bun run test:e2e`    | Testes de ponta a ponta (Playwright)                                     |
| `bun run test:e2e:ui` | Testes com a interface visual do Playwright                              |

## Testes

Os testes de ponta a ponta ficam em `e2e/` e cobrem login, recuperação de senha, segurança
das rotas do Better Auth, layout no celular, acessibilidade (axe, WCAG 2.2 AA) e o mascote. Eles criam alunas de teste próprias
(`e2e-<id>-...@teste.com`) e as removem no final.

```bash
bun x playwright install chromium   # só na primeira vez
bun run db:up                       # o banco precisa estar no ar
bun run test:e2e                    # sobe o `bun run dev` sozinho, se não estiver rodando
```

O executor do Playwright roda no **Node.js**, não no Bun: o `playwright` começa com
`#!/usr/bin/env node` e o `bun run` respeita essa linha. É de propósito: o Playwright não
suporta oficialmente o runtime do Bun. O app testado continua rodando no Bun
(`bun --bun next dev`). Por isso os testes precisam do Node instalado na máquina.

## Estrutura

```
docs/                 # Produto e integração com a Hotmart
e2e/                  # Testes de ponta a ponta (Playwright)
drizzle/              # Migrações geradas (não editar à mão)
scripts/              # Scripts de desenvolvimento
src/
  app/                # Rotas (App Router); /api/auth/* é do Better Auth
  components/
    brand/            # Identidade: logo, cartão e página das telas de acesso
      mascot/         # Mascote: desenho, comportamento e avisos (events.ts)
    ui/               # Componentes shadcn/ui adaptados ao tema
  features/
    auth/             # Telas de acesso: componentes, schemas, mensagens
      server/         # Server Actions e regras do lado do servidor
  config/             # Regras de acesso e variáveis de ambiente (Zod)
  lib/                # Utilitários (cn, search params)
  server/             # Infraestrutura do servidor: auth, banco, requisição
  types/              # Declarações de tipos (imagens importadas)
```

Dependências num sentido só: `app` → `features` → `server` / `components`. O `server` não
conhece as telas, e o mascote não conhece o login: as telas avisam o mascote por
`components/brand/mascot/events.ts`.

## Documentação

- [Integração com a Hotmart](docs/INTEGRACAO-HOTMART.md): visão, decisões e pendências da próxima etapa.
