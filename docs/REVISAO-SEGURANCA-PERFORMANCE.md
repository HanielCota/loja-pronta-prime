# Revisão de segurança, validação e desempenho

Data: 6 de outubro de 2026. Branch: `fix/security-performance-review`.

Atualização: a [revisão de 17 de outubro de 2026](REVISAO-SISTEMA-2026-10-17.md) registra as
correções posteriores e as validações com Postgres e armazenamento ativos. As pendências e os
resultados abaixo permanecem como histórico daquela execução.

Foram corrigidas lacunas no recebimento de arquivos, na validação de destinos, no consumo de
memória e no primeiro acesso. As consultas do SLL foram reduzidas sem compartilhar o progresso
entre alunas. O visual e as regras de desbloqueio continuam iguais. Não houve alteração de schema
nem migração.

A análise cobriu os pontos de entrada de `src/app`, as Server Actions, autenticação, permissões,
armazenamento, Hotmart, banco, componentes React, configuração e dependências. A revisão é baseada
em código e verificações locais; não é um teste de invasão da hospedagem nem uma garantia de ausência
de vulnerabilidades. Os fluxos autenticados precisam de validação integrada com o Postgres ativo.

## Achados corrigidos

### 01 — Corpos de uploads e webhook sem limite durante a leitura

**Severidade:** média. **Regras:** NEXT-INPUT-001, limites de recursos.

**Local:** `src/app/api/admin/learning-content/media/route.ts:65`,
`src/app/api/admin/sll-banners/[bannerId]/media/route.ts:68`,
`src/app/api/sll/course-cover/[trackId]/route.ts:98`,
`src/app/api/hotmart/webhook/route.ts:31`.

**Evidência anterior:** `await request.formData()` e `await request.text()` carregavam o corpo antes
da validação completa. O cabeçalho `Content-Length` pode faltar; `raw.length` contava caracteres,
não bytes. As rotas de arquivo exigem admin e o webhook exige o token: não foi identificado um
upload anônimo liberado.

**Impacto:** pedidos grandes autorizados poderiam consumir memória além do limite anunciado.
**Correção:** `src/lib/request-body.ts:5` limita os bytes enquanto recebe, cancela ao exceder e usa
um buffer com crescimento limitado. Multipart inclui todos os campos no limite; JSON exige UTF-8
válido. A transcrição usa a mesma proteção. Mantidos os limites de arquivo e as guardas de acesso.
**Validação:** casos sem cabeçalho, com tamanho falso, Unicode, conexão interrompida, campos extras,
cancelamento e 70 mil pedaços pequenos; conferência adicional no runtime Node.

### 02 — Download de materiais acumulava o arquivo inteiro na memória

**Severidade:** média para disponibilidade. **Regra:** limites de recursos.

**Local:** `src/app/api/sll/material/[blockId]/route.ts:84` e
`src/app/api/admin/learning-content/draft-media/[blockId]/route.ts:38`.
**Evidência anterior:** `storage().get()` seguido de `new Response(bytes.buffer)`.
**Impacto:** downloads simultâneos multiplicavam o tamanho dos arquivos na memória do servidor.
**Correção:** `storage().stream()` transmite o corpo do S3; permissões, bloqueio de etapas,
publicação, download como anexo e `private, no-store` foram preservados.
**Validação pendente:** transferência autenticada com bucket e banco ativos.

### 03 — Regras diferentes e incompletas para links de conteúdo

**Severidade:** baixa. **Regras:** NEXT-INPUT-001, navegação segura.

**Local:** `src/lib/urls.ts:5`, `src/features/admin/server/banner-actions.ts:42`,
`src/features/admin/server/resource-actions.ts:38`, `src/features/admin/publication-rules.ts:56`.
**Evidência anterior:** banners e recursos aceitavam qualquer URL HTTP/HTTPS, inclusive com
credenciais, e caminhos internos sem conferir sua normalização. A edição e a publicação tinham
validadores separados.
**Impacto:** destinos enganosos ou malformados poderiam ser publicados. Não foi demonstrada
execução de JavaScript por esses caminhos internos.
**Correção:** regra compartilhada bloqueia protocolos executáveis, credenciais, controles,
barras invertidas e caminhos que normalizam para `//`. Aplica-se ao salvar, publicar e ler conteúdo
antigo. Links inválidos não vão para a aluna. Textos continuam escapados pelo React; não são
convertidos em HTML nem têm palavras removidas arbitrariamente.
**Validação:** testes de URLs, prévia e publicação.

### 04 — Eventos Hotmart e argumentos de ações com validação insuficiente

**Severidade:** baixa. **Regra:** NEXT-INPUT-001.

**Local:** `src/features/hotmart/event.ts:4`,
`src/features/sll/server/progress-actions.ts:143`, `src/features/admin/server/actions.ts:79`.
**Evidência anterior:** campos do webhook sem máximo, datas fora do intervalo do processamento,
booleano aceito apenas pela tipagem e email administrativo conferido por `includes('@')`.
**Impacto:** entradas inválidas podiam causar erros de banco ou alterar progresso pela coerção
de valores verdadeiros. As ações já conferiam acesso e posse no servidor.
**Correção:** limites nos campos, rejeição de controles e datas não representáveis, booleano real
para conclusão, email validado e até 100 aulas relacionadas consultadas por seus IDs.
**Validação:** testes de eventos incompletos, campos excessivos, datas e idempotência existentes.

### 05 — Reserva do limitador de tentativas podia crescer sem teto

**Severidade:** média. **Regra:** limites de recursos.

**Local:** `src/server/auth/rate-limit.ts:55`, `src/lib/rate-limit-memory.ts:4`.
**Evidência anterior:** remover entradas vencidas não impedia milhares de novas entradas ativas.
**Impacto:** durante indisponibilidade do banco, muitas identidades poderiam aumentar o Map
indefinidamente.
**Correção:** máximo de 10 mil entradas por processo. Ao encher, novas identidades são barradas até
haver entradas vencidas; limites ativos não são descartados. O Postgres continua sendo o contador
principal, atômico e compartilhado.
**Limite operacional:** a reserva continua sendo por processo, não distribuída entre instâncias.

### 06 — Revogação no primeiro acesso não era atômica com a senha

**Severidade:** média. **Regra:** NEXT-SESS-002.

**Local:** `src/features/auth/server/first-access.ts:120`.
**Evidência anterior:** o encerramento das outras sessões ocorria depois da transação e podia
falhar sem impedir a confirmação da troca.
**Impacto:** alguém com uma sessão aberta usando a senha temporária poderia continuar conectado
após uma falha na revogação.
**Correção:** senha, marca de primeiro acesso e remoção das outras sessões terminam na mesma
transação. A sessão atual permanece. Hash e verificação continuam usando o Better Auth.
**Validação pendente:** suíte de primeiro acesso e sessões concorrentes com banco ativo.

### 07 — Serviços de desenvolvimento acessíveis na rede

**Severidade:** média no ambiente local. **Regra:** isolamento de desenvolvimento.

**Local:** `docker-compose.yml:13`, `package.json:6`.
**Evidência anterior:** porta `5433:5432` sem endereço de bind, com senha local conhecida;
Next dev também escutava na rede.
**Correção:** Postgres e Next dev escutam em `127.0.0.1`. O comando de produção permanece próprio
para hospedagem. Quem precisar acessar o dev por outro aparelho terá de alterar o bind de propósito.

### 08 — Cabeçalhos com proteção adicional

**Severidade:** baixa, defesa adicional. **Regra:** NEXT-XSS/CSP.

**Local:** `next.config.ts:34`.
**Correção:** além de impedir incorporação das páginas, a CSP bloqueia objetos, restringe a base
de URLs e o envio de formulários à própria origem. Não foi adotada uma CSP completa de scripts:
isso exige validar nonces, scripts de tema, worker e player antes de restringir essas fontes.
**Validação:** cabeçalho conferido em resposta HTTP e login aberto no navegador.

## Melhorias de desempenho

- `src/features/sll/server/progress.ts:21`: `React.cache` deduplica a mesma trilha durante uma
  renderização, sem cache global de dados de alunas.
- `src/features/sll/server/catalog.ts:30`: a busca pela primeira trilha carrega somente a escolhida,
  em vez de carregar todas as trilhas com aulas e progresso.
- `src/features/products/server/access.ts:66`: menu e conteúdo agendam um único registro de visita
  por produto durante a renderização.
- `src/features/sll/server/lesson-viewer.ts:73`: Map substitui buscas repetidas nas aulas.
- `src/features/sll/progress-rules.ts:105`: resumo evita uma busca linear para cada aula.
- Materiais passam a usar streaming; consultas de aulas relacionadas filtram os IDs pedidos.

São reduções verificáveis de trabalho e de alocação. Não foi medida uma porcentagem de ganho
nem executado benchmark de carga contra a produção.

## Pendências identificadas

### 09 — Emails de autenticação ainda sem provedor

**Prioridade:** alta antes de disponibilizar recuperação real em produção.
**Local:** `src/server/auth/emails.ts:13`.
**Evidência:** `deliver()` só registra o link em desenvolvimento e avisa em produção que não enviou.
**Impacto:** confirmação e recuperação não chegam à aluna. Essa limitação já está documentada no
projeto. Exige escolha/configuração de provedor e credenciais; nenhum envio real foi inventado.

### 10 — Revogação na troca de senha do perfil ainda é uma operação separada

**Severidade:** média em caso de falha de banco.
**Local:** `src/features/auth/server/profile.ts:168` e `src/server/auth/sessions.ts:12`.
**Evidência:** `auth.api.changePassword()` precede `revokeOtherSessions()`, que registra e absorve
falhas. O primeiro acesso foi corrigido; a troca normal usa a API da biblioteca e continua com
essa limitação.
**Próximo passo:** validar uma integração transacional da alteração normal com a revogação,
preservando a sessão e o aviso de sucesso. A biblioteca, os hashes e a sessão não foram
reescritos sem a possibilidade de conferir o fluxo integrado.

### 11 — Alertas em dependências de desenvolvimento

`bun audit` encontrou dois alertas; `bun audit --production` verificou 213 pacotes sem alertas.

- `braces@3.0.3`, via shadcn/registry: gravidade alta no aviso do fornecedor, escopo de
  desenvolvimento neste projeto. Não existe versão corrigida publicada conforme o
  [aviso GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
- `esbuild@0.18.20`, via Drizzle Kit/core-utils: gravidade moderada, relacionada ao servidor de
  desenvolvimento do esbuild conforme o
  [aviso GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99).
  Não foi encontrado um servidor esbuild exposto pelos scripts do projeto.

`bun audit fix` foi executado e não alterou os pacotes: falta patch de braces e a atualização de
esbuild está fora do intervalo exigido pelo dependente. Não foi forçado um override incompatível
da ferramenta de migração. Os dois alertas continuam abertos.

## Validação e limites

- `bun run typecheck`: passou.
- `bun run lint`: passou.
- `bun test src`: 251 testes passaram, nenhum falhou, incluindo o design guard.
- Build de produção: passou; repetido após as últimas mudanças.
- Prettier nos arquivos alterados e `git diff --check`: passaram.
- Leitura multipart e limite de bytes: conferidos também com Node, runtime usado pelo Next.
- Login: conferido em 1440 e 390 pixels, claro e escuro, sem rolagem horizontal; recuperação
  também abriu. Capturas locais em `.data/security-review/`.
- HTTP: login/cadastro/reset/verify-password desativados retornaram 404; upload admin sem sessão
  retornou 401; a CSP ampliada apareceu na resposta.
- `bun run test:e2e -- e2e/api-security.spec.ts e2e/sll-regressions.spec.ts`: não executou os
  cenários, pois o setup não conseguiu conectar ao Postgres. Docker Desktop foi iniciado, mas
  o daemon não ficou disponível; `docker compose up -d --wait` também falhou.

Ainda precisam ser conferidos com infraestrutura ativa: primeiro acesso, alteração de senha,
isolamento entre alunas, bloqueios/reembolsos, progresso SLL, CSRF de uploads com admin, downloads
do bucket e processamento autenticado Hotmart. Proxy confiável, privacidade do bucket, TLS,
backups e permissões da hospedagem não foram verificados remotamente.

Referências técnicas: [segurança de dados do Next.js](https://nextjs.org/docs/app/guides/data-security),
[limites do Better Auth](https://better-auth.com/docs/concepts/rate-limit) e
[cache por requisição do React](https://react.dev/reference/react/cache).
