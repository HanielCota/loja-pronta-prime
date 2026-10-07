# Publicação no Coolify Cloud

## O que este projeto precisa

- Next.js 16.3.8 (App Router), React 19.3.0 e Bun 1.4.2 como gerenciador de pacotes e bundler.
- Node.js 24 LTS para build e servidor de produção. O mínimo declarado pelo Next e pelo Sharp é 20.9.0,
  mas o projeto seleciona a linha 24 no `package.json` para a hospedagem.
- PostgreSQL 17, com as migrações de `drizzle/` aplicadas pelo migrador do Drizzle ORM.
- Bucket S3 privado (AWS ou compatível) para logos, vídeos e legendas.
- OpenAI Images API para criar logos com IA; a chave é opcional para iniciar o servidor.

É uma aplicação de servidor, com autenticação e Server Actions. Não é exportação estática.
Railpack reconhece Bun pelo `packageManager` e pelo `bun.lock`; não é necessário Dockerfile.

## Campos da aplicação

Depois de integrar o PR de preparação na `main`, abra `LojaPrime` → `production`.
Confira se já existe uma aplicação deste repositório antes de criar outra. Preserve recursos,
bancos e volumes existentes.

| Campo                                                     | Valor                                                                      |
| --------------------------------------------------------- | -------------------------------------------------------------------------- |
| Projeto                                                   | `LojaPrime`                                                                |
| Ambiente                                                  | `production`                                                               |
| Servidor                                                  | `contabo-prod-01`                                                          |
| Nome da aplicação                                         | `loja-pronta-prime` (ou o nome da aplicação existente)                     |
| Source                                                    | GitHub App já conectada                                                    |
| Repository                                                | `HanielCota/loja-pronta-prime`                                             |
| Branch                                                    | `main`                                                                     |
| Build Pack                                                | Railpack                                                                   |
| Base Directory                                            | `/`                                                                        |
| Is it a static site?                                      | Desativado                                                                 |
| Install Command                                           | Vazio: o Railpack já instala com `bun install --frozen-lockfile`           |
| Build Command                                             | `bun run build`                                                            |
| Start Command                                             | Vazio: usa o comando versionado em `railpack.json`                         |
| Ports Exposes                                             | `3000`                                                                     |
| Port Mappings                                             | Vazio; o proxy encaminha o domínio para a porta interna                    |
| Publish Directory                                         | Vazio                                                                      |
| Pre-deployment Command                                    | Vazio                                                                      |
| Post-deployment Command                                   | Vazio                                                                      |
| Persistent Storage da aplicação                           | Nenhum volume obrigatório                                                  |
| Domains                                                   | URL HTTPS do domínio escolhido; preencha com o domínio real                |
| Health Check                                              | Ativado, `GET`, HTTP, porta `3000`, caminho `/api/auth/ok`, esperado `200` |
| Health Check: interval / timeout / retries / start period | `10s` / `5s` / `6` / `10s`                                                 |

Em **Advanced**, mantenha **Use Docker build cache** ativado. Não preencha o Install Command:
um comando personalizado faz o Railpack copiar todas as fontes antes da instalação, invalidando
o cache quando só o código muda. O comando automático continua usando o lockfile congelado.

Em **Watch Paths**, use uma linha por padrão, nesta ordem:

```text
**
!video/**
!docs/**
!**/*.md
```

Assim, mudanças só no vídeo de apresentação ou na documentação não publicam o site. O filtro
vale para deploy automático por webhook; o botão Deploy continua disponível quando necessário.

O comando de início aplica migrações **na imagem nova**, inclusive no primeiro deploy. Se
falharem, o servidor não inicia. Não use o pre-deployment para isso: ele pode executar na
aplicação antiga e é pulado no primeiro deploy. Não execute migrações durante o build.
O build instala as dependências completas. `next build` gera o servidor standalone, e
`scripts/prepare-runtime.ts` reúne em `build/runtime` o servidor, assets, as seis fontes dos logos,
SQL e um migrador pequeno. A imagem final copia essa pasta e os runtimes, conforme `railpack.json`.
O comando de início executa `node migrate.cjs` e só então `node server.js`. O migrador preserva
`drizzle.__drizzle_migrations`, o mesmo histórico usado por `bun run db:migrate` no desenvolvimento.
Não ative `RAILPACK_PRUNE_DEPS=true` nem use `bun install --production` no build.

A migração `0039_sll-panda-video-links.sql` também vincula os vídeos Panda às aulas SLL já existentes.
Não substitui vídeos editados nem rascunhos pendentes e não muda publicação, acesso ou progresso.
Se a estrutura de aulas ainda não existir nesse banco, importe-a antes de conferir os 71 vínculos;
veja `docs/SLL-VIDEOS-PANDA.md`. A migração e os IDs seguem na imagem, sem depender de arquivos locais.

Faça um deploy por vez. Antes de migrar um banco existente, tenha backup e confira as migrações
pendentes: há migrações históricas que removem estruturas antigas do logo. Voltar a imagem não
desfaz alterações do banco. Não gere novas migrações nem use `db:push` na hospedagem.

## Variáveis: configurar antes de publicar

Na aplicação, abra **Environment Variables**. Os exemplos de `.env.example` são fictícios e não
devem ser copiados como credenciais de produção. Não envie secrets pelo Git ou por comentários
do PR. Preencha as variáveis de infraestrutura como **Runtime**, sem **Build Variable**.

| Obrigatória            | Como obter o valor                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | Internal URL do PostgreSQL da aplicação, na mesma rede Docker; ou a URL real do provedor externo, com SSL conforme exigido |
| `BETTER_AUTH_SECRET`   | Secret aleatório exclusivo, com pelo menos 32 caracteres; mantenha o mesmo nos próximos deploys                            |
| `BETTER_AUTH_URL`      | URL pública HTTPS canônica da aplicação, sem caminho e sem a porta interna `3000`                                          |
| `TRUSTED_PROXY_HOPS`   | Quantidade real de proxies confiáveis na cadeia `X-Forwarded-For`; `1` apenas se existir um proxy                          |
| `S3_BUCKET`            | Nome do bucket privado existente                                                                                           |
| `S3_ACCESS_KEY_ID`     | Access key do provedor de armazenamento                                                                                    |
| `S3_SECRET_ACCESS_KEY` | Secret key correspondente                                                                                                  |

Para gerar o secret, rode em um terminal seguro e copie diretamente para o Coolify:

```bash
openssl rand -base64 32
```

| Opcional              | Quando preencher                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`      | Para criar logos por IA e transcrever voz; projeto OpenAI com acesso a `gpt-image-1-mini` e `gpt-transcribe`, com saldo disponível |
| `S3_ENDPOINT`         | Endpoint exato de um provedor compatível com S3; omita para AWS S3                                                                 |
| `S3_REGION`           | Região real do bucket; padrão do código: `us-east-1`                                                                               |
| `S3_FORCE_PATH_STYLE` | `true` se o provedor exigir acesso por caminho; padrão do código: `false`                                                          |

Região, endpoint e estilo de acesso são opcionais na validação, mas precisam corresponder ao
provedor escolhido. Se não usar uma variável opcional, **omita**, em vez de deixar vazia.
As credenciais S3 precisam permitir ler, gravar, apagar objetos e listar os prefixos utilizados
pela aplicação (`logos/` e `videos/`). Os arquivos chegam ao navegador por rotas da própria
aplicação, sem URL pública ou CORS de bucket obrigatório.

Configure também `PORT=3000` como Runtime. `NODE_ENV=production` é definido pelo Railpack;
se o painel exigir um valor explícito, use `production`. Não configure `NEXT_PHASE`: ela é
interna do build do Next. Não crie `NEXT_PUBLIC_*`: este projeto não usa nenhuma.
Railpack lê Node `24.x` de `engines.node` e Bun `1.4.2` de `packageManager`. Confira essas
versões no log do build. Se precisar corrigir a detecção na versão instalada do Coolify, use
`RAILPACK_NODE_VERSION=24` e `RAILPACK_BUN_VERSION=1.4.2` como **Build Variable**.

## Banco, rede e persistência

Use o banco da aplicação, nunca o banco interno do Coolify. Se ainda não existir, crie um
PostgreSQL 17 em `LojaPrime` / `production`, no servidor e destino de rede da aplicação. Inicie
o banco e espere ficar saudável antes do deploy. Copie a **Internal URL** para `DATABASE_URL`.
O container usa o nome interno do banco e a porta `5432`; `localhost` apontaria para a própria
aplicação. O `docker-compose.yml` do repositório serve somente ao desenvolvimento.

O PostgreSQL 17 precisa de volume em `/var/lib/postgresql/data` e backups fora da VPS. Se o
banco for externo, a persistência pertence ao provedor. Preserve o bucket e seus objetos entre
deploys, com uma política de backup ou versionamento adequada.

Não há uploads locais persistentes. `.next/cache` é um cache descartável; não monte um volume
sobre `.next`, `/app`, `node_modules` ou `public`, pois ocultaria arquivos da imagem. As fontes
dos logos são lidas de `node_modules/@fontsource`; o build copia os seis arquivos usados para a
imagem standalone. Sharp precisa dos binários Linux instalados pelo Bun: não copie `node_modules` do
Windows para a VPS.

### Armazenamento S3 novo no Coolify

Para uma instalação nova, o serviço `LojaPrime S3` usa Garage 2.3.0 no mesmo servidor e
ambiente da aplicação. Ele inicia com `/garage server --single-node --default-bucket`, cria
o bucket privado `lojaprime` e recebe credenciais novas por variáveis de ambiente. Os valores
de `GARAGE_DEFAULT_ACCESS_KEY` e `GARAGE_DEFAULT_SECRET_KEY` também configuram
`S3_ACCESS_KEY_ID` e `S3_SECRET_ACCESS_KEY` da aplicação; nunca ficam no repositório.

Configure `S3_REGION=garage`, `S3_FORCE_PATH_STYLE=true` e `S3_ENDPOINT` com o nome real
do container Garage na rede interna, na porta `3900`. O serviço precisa conectar à rede Docker
da aplicação. Não publique portas, domínio S3 nem API administrativa: logos e vídeos chegam
ao navegador pelas rotas autenticadas da aplicação.

Preserve os dois volumes: dados em `/var/lib/garage/data` e metadados em
`/var/lib/garage/meta`, além da configuração `/etc/garage.toml`. Uma instalação com apenas
um servidor não tem redundância; banco e arquivos precisam de backup fora da VPS. Criar o
armazenamento não importa conteúdo do bucket de desenvolvimento.

## Domínio, autenticação e proxy

Escolha um domínio público, configure o DNS para a VPS e habilite HTTPS nos **Domains** da
aplicação. O hostname usado no navegador deve coincidir com `BETTER_AUTH_URL`; callbacks e
links de acesso são derivados dessa variável. Se publicar mais de um hostname, escolha um
canônico e redirecione os demais. Não há OAuth de Google ou Shopee configurado nesta versão.

O Next já usa `PORT` (padrão `3000`); `railpack.json` define `HOSTNAME=0.0.0.0`. A porta pública
continua sendo HTTPS `443`, encaminhada pelo proxy para `3000`. Não publique um mapeamento
direto da porta da aplicação: isso permitiria contornar o proxy usado para identificar o IP.
Confirme `TRUSTED_PROXY_HOPS` se houver CDN ou outro proxy; não presuma a quantidade.

As Server Actions aceitam até 6 MB no transporte para comportar o limite existente de 5 MB
do logo e os campos do formulário. Se existir limite de upload em um proxy externo, ele também
precisa permitir esse tamanho. A geração de imagem pode levar 120 segundos: confira eventuais
timeouts do proxy/CDN dessa rota, sem alterar configurações globais do servidor.

Manrope e Inconsolata são baixadas por `next/font/google` durante o build e servidas localmente
depois. O build precisa alcançar Google Fonts e o registro de pacotes. As imagens do mascote
são locais; os logos vêm das rotas da aplicação. Não são necessários `images.remotePatterns`.

## Validação e publicação

O servidor standalone foi validado com Railpack 0.23.0 (helper do Coolify 1.0.17), Node 24.21.0
e Bun 1.4.2, sem secrets no build. A imagem resultante tem aproximadamente 763 MB, e a pasta
da aplicação tem 86 MB. Uma segunda construção, com alteração nas fontes do projeto e o mesmo
lockfile, reutilizou `bun install --frozen-lockfile` em cache. A imagem iniciou na porta `3307`,
aplicou migrações, respondeu `200` no login, na saúde, nas seis fontes e no redimensionamento
de imagem pelo Sharp. Uma conta em PostgreSQL temporário entrou pela Server Action e acessou
o início autenticado. O migrador e o Drizzle Kit foram alternados em bancos novo e já migrado:
o histórico permaneceu com 39 registros, sem reaplicar SQL. Sem `DATABASE_URL`, o migrador
terminou com erro, impedindo o início do servidor.

O primeiro deploy dessa configuração em `contabo-prod-01` foi concluído em 6 de outubro de
2026, às 21h28 (Brasília), com o container saudável e migrações concluídas. Comparação com o
deploy anterior, na mesma VPS:

| Medida                           | Antes    | Depois  |
| -------------------------------- | -------- | ------- |
| Deploy completo                  | 10min28s | 4min50s |
| Imagem no Docker                 | 3,06 GB  | 772 MB  |
| Build da aplicação               | 102,6s   | 61,7s   |
| Cópia da aplicação para a imagem | 33,5s    | 1,1s    |
| Exportação e carga da imagem     | 211,4s   | 64,5s   |
| Espera inicial de saúde          | 60s      | 10s     |

Deploys comparados: `sbl4os94wd6e8um7wpmc50vp` (antes) e `ql6mtmoxwelw6oftuwht7mqi` (depois),
com a correção do PR #87 (`3478a8c`). A primeira construção ainda instalou as dependências
na nova camada de cache; construções seguintes podem reutilizá-la quando `package.json` e
`bun.lock` não mudam. Os tempos também dependem de CPU, disco e rede da VPS.
Saúde, login, seis fontes e redimensionamento de imagem responderam HTTP `200` no domínio real.

Esta preparação foi validada em Windows e em um container Linux com Node 24.21.0, Bun 1.4.2 e
limite de 4 vCPU / 4 GB de RAM. O container Linux recebeu somente arquivos versionados, sem
`.env.local`, e fez instalação limpa, typecheck, lint, 153 testes e build de produção sem
secrets. As migrações foram aplicadas duas vezes em um PostgreSQL 17 temporário, sem duplicar
estruturas. `next start` respondeu nas portas `3000` e `3001` (teste de `PORT`): login `200`,
`/api/auth/ok` `200`, início sem sessão redirecionado ao login e fonte do logo `200`.
Uma conta temporária também entrou pela Server Action real: recebeu o cookie de sessão e
acessou início, Loja Pronta e etapa do nome com HTTP `200`. As seis fontes responderam `200`.
O comando completo de início com migrações foi exercitado no container.

Isso valida Linux/Docker e o código; não substitui o teste da imagem gerada pelo Railpack no
Coolify, nem valida credenciais S3/OpenAI de produção. O endpoint `/api/auth/ok` verifica HTTP
e inicialização da autenticação; não testa conexão com o banco, schema, S3 ou OpenAI.

Depois de preencher e confirmar os valores reais:

1. Selecione **Deploy**, mantendo a branch `main` com o PR de preparação integrado.
2. No log, confira Node/Bun, instalação com lockfile, `next build`, migrações concluídas e
   servidor em `0.0.0.0:3000`. Confira também o log de runtime.
3. Abra `/api/auth/ok` e `/entrar` no domínio HTTPS: ambos devem responder `200`.
4. Entre com uma conta existente e liberada para confirmar banco, cookie e Server Actions.
   O script `dev:aluna` não funciona em produção e não deve ser usado para provisionar clientes.
5. Com as credenciais reais, confira envio/download de logo e leitura de vídeo. Gere um logo
   somente quando quiser testar a OpenAI de verdade, pois isso tem custo.
6. Na rota `/loja-pronta/marca/logo`, no campo **Escreva do seu jeito**, toque no microfone,
   permita o acesso, fale em português, pare a gravação e confira se o texto aparece no campo
   para revisão. A transcrição usa a OpenAI e tem custo. Confira também a mensagem após negar a
   permissão e a possibilidade de escrever manualmente. Sem `OPENAI_API_KEY`, o microfone aparece como **em breve**.

## Limitações encontradas

- O provedor de email ainda não está implementado: redefinição e confirmação não enviam email
  em produção. Adicionar uma variável SMTP não resolve; falta implementar o envio.
- Hotmart e provisionamento automático de alunas ainda não estão implementados. Não há cadastro
  público, e o script de contas de teste é bloqueado em produção. Um banco novo fica sem alunas.
- Conexão/publicação pela API da Shopee e partes do curso ainda estão em breve. A publicação
  da aplicação não habilita essas integrações.
- OpenAI e S3 dependem de credenciais, permissões, rede e disponibilidade reais; não foram
  exercitados nesta validação. Um bucket novo não contém os vídeos ou logos já existentes.
- Railpack é apresentado como Beta pelo Coolify e exige Docker Buildx no servidor de build e
  no helper do Coolify. Se indisponível, o deploy exige ajuste pelo responsável da hospedagem.

## Referências oficiais

- [Railpack no Coolify](https://coolify.io/docs/applications/builds/railpack)
- [Detecção e versões de Bun no Railpack](https://railpack.com/languages/bun/)
- [Node e configuração de pacotes no Railpack](https://railpack.com/languages/node/)
- [Banco e conexão interna no Coolify](https://coolify.io/docs/databases/)
- [Comandos de deployment no Coolify](https://coolify.io/docs/applications/builds/dockerfile)
- [Servidor standalone do Next](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Configuração e arquivos da imagem Railpack](https://railpack.com/config/file/)
- [Filtros dos deploys automáticos](https://coolify.io/docs/applications/deployments/automatic-deployments)
- [Limite de corpo das Server Actions](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions)
