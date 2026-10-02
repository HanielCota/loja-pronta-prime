# Loja Pronta Prime

Next.js (App Router) + TypeScript + Tailwind CSS, com Bun como runtime e gerenciador de pacotes.

## Como rodar

```bash
bun install
cp .env.example .env.local
bun run dev
```

Acesse http://localhost:3000.

## Scripts

| Script              | Descrição                          |
| ------------------- | ---------------------------------- |
| `bun run dev`       | Servidor de desenvolvimento        |
| `bun run build`     | Build de produção                  |
| `bun run start`     | Servidor de produção               |
| `bun run lint`      | ESLint                             |
| `bun run lint:fix`  | ESLint com correção automática     |
| `bun run format`    | Prettier                           |
| `bun run typecheck` | Checagem de tipos (`tsc --noEmit`) |

## Estrutura

```
src/
  app/            # Rotas (App Router)
  components/
    ui/           # Componentes de UI base
  features/       # Módulos por domínio
  lib/            # Utilitários e clientes
  hooks/          # React hooks
  types/          # Tipos compartilhados
  config/         # Configurações da aplicação
  server/         # Código exclusivo do servidor
```
