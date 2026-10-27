# Prompt oneshot: suporte por chamados no Escala Shop (Loja Pronta Prime)

> Cole este arquivo inteiro como pedido para a IA que vai implementar. Ele é **oneshot**: todas as
> decisões já estão tomadas aqui, então execute as fases da seção 16 em sequência, do começo ao fim,
> sem parar para perguntar. Onde algo não estiver escrito, siga o padrão da tela ou do módulo mais
> parecido que já existe no repositório e registre a escolha em `docs/SUPORTE.md`.
>
> Fontes: o suporte do SellBridge (`C:\Users\Administrator\Projetos\SellBridge`, commit `8440d874`,
> mais as branches `feat/support-deadline-hours`, `feat/support-performance`,
> `feat/support-assistant`, `feat/support-customer-ticket-states` e `feat/support-impersonation-v2`)
> e o estado atual deste repositório. Leve o **funcionamento**, não o código: as stacks são
> diferentes (lá TanStack + BullMQ; aqui Next.js App Router + Server Actions + Bun) e o domínio
> também (lá venda; aqui curso e montagem de loja). Pode ler o código do SellBridge para tirar
> dúvida de comportamento; nunca copie arquivos de lá.

---

## 0. Regras de execução

1. Leia `AGENTS.md`, `docs/PRODUTO.md`, `docs/DESIGN.md` e este arquivo inteiro antes de começar.
2. **Não faça commit, branch, push nem PR.** Tudo fica no working tree; o dono roda `/pr` depois.
3. O visual não muda: telas novas copiam a tela existente mais parecida (Perfil para a aluna, Contas e
   Leads para a equipe, Visão geral do admin para o desempenho). Não crie biblioteca de UI, não
   crie padrão visual novo (nada de bolha flutuante, sino ou barra lateral nova para a aluna).
4. Ao fim de **cada fase**: `bun run typecheck && bun run lint && bun test src`, testes de integração
   quando mexer no banco (`bun run test:integration`) e Playwright com axe nas telas novas (celular e
   computador, claro e escuro). Só avance com tudo verde. Se uma fase quebrar algo que já existia,
   conserte antes de seguir.
5. Ao terminar, escreva `docs/SUPORTE.md` (como funciona, regras, onde fica cada coisa, decisões) e
   atualize `docs/PRODUTO.md` e `docs/DESIGN.md` onde o suporte aparece.
6. Abra as telas no navegador em `localhost:3001` (celular e computador, claro e escuro) e confira
   antes de declarar pronto.

## 1. O que existe hoje

- **Suporte por WhatsApp por assunto:** `src/features/support/contacts.ts` (`SUPPORT_TOPICS`:
  `technical` "Erros, bugs e acesso" / Mylena, `lessons` "Dúvidas sobre as aulas" / Rackel,
  `shipping` "Dúvidas sobre o Envio Velox" / Nabila, `ombudsman` "Ouvidoria" / Dani), tabela
  `support_contacts`, página `/admin/suporte` ("Contatos por assunto"). A aluna vê em
  `/perfil#suporte` (`HelpGroup` em `src/features/auth/components/profile-groups.tsx`), no menu da
  conta ("Suporte no WhatsApp", `src/features/member/components/account-menu.tsx`), no `TalkToTeam`
  do painel da Loja Pronta (`src/features/loja-pronta/components/store-panel.tsx`) e no aviso de
  acesso vencendo (`TEAM_WHATSAPP` em `src/config/support.ts`).
- **Papéis:** só `admin` e aluna. `user.role` é texto separado por vírgula (`hasAdminRole` em
  `src/features/admin/access.ts`). `requireAdmin(path)` devolve 404
  (`src/features/admin/server/access.ts`). Sem matriz de permissões. Cadastro público fechado
  (`disableSignUp: true`); contas vêm da Hotmart ou do admin.
- **E-mail:** Resend por `fetch` em `src/server/auth/emails.ts`, só de autenticação
  (`EMAIL_DELIVERY=log` fora de produção).
- **Segundo plano:** worker `scripts/run-assistant-worker.ts` com fila em tabela (`assistant_jobs`,
  `for update skip locked`) e heartbeat (`runtime_heartbeats`). Sem cron.
- **Arquivos:** `storage()` em `src/server/storage/index.ts` (S3). Server Actions até 6 MB; acima disso,
  route handler com `readLimitedFormData` (`src/lib/request-body.ts`). Assinatura de arquivo em
  `src/features/admin/media-validation.ts`. Rota privada de arquivo: foto de perfil
  (`src/app/(member)/perfil/foto/[foto]/route.ts`).
- **Limite de tentativas:** `consumeAttempt` no banco (`src/server/auth/rate-limit.ts`, escopos em
  `src/config/auth.ts`).
- **Fila parecida:** Leads (`src/server/db/schema/leads.ts`, `src/features/leads/`): responsável,
  atividade na mesma transação, filtros GET sem JS, CSV.
- **Presença:** heartbeat de 30 s (`src/features/presence/`), "Online agora" no admin.
- **Admin:** layout `src/app/(admin)/layout.tsx`, `AdminPage`, barra
  `src/features/admin/components/admin-sidebar.tsx` (grupos "Painel", "Alunas e vendas", "Conteúdo
  das alunas", "Operação"), seções em `src/features/admin/admin-section.ts`, `AutoRefresh`,
  `OnlineCountBadge`.
- **`session.impersonatedBy`** existe no schema (plugin admin do better-auth), sem tela.

## 2. Decisões tomadas (não perguntar de novo)

| # | Tema | Decisão |
|---|---|---|
| 1 | WhatsApp | **Os dois canais convivem.** O chamado é o canal principal dentro da plataforma; o WhatsApp por assunto **continua** onde já está e ganha lugar nas telas novas (seção 7.6). Nada do WhatsApp atual é removido nem muda de comportamento. |
| 2 | Responsável por tema | Cada tema pode ter uma **responsável padrão** (configurável; começa com Mylena, Rackel, Nabila e Dani se as contas existirem como equipe, senão vazio). Sem responsável padrão, o chamado cai em "Sem responsável". Ouvidoria sempre vai para a fila restrita (seção 9). |
| 3 | Cargos | "Atendente", "Supervisor" e "Administrador". |
| 4 | Prazo | Conta **só horas de atendimento** (horário e feriados configuráveis). Padrão: segunda a sexta das 8h às 18h e sábado das 8h às 12h, horário de Brasília. Prazos padrão: urgente 2 h, alta 4 h, normal 8 h, baixa 16 h de atendimento. A promessa na tela é calculada a partir disso ("Respondemos em até 8 horas de atendimento"); nunca prometa "1 dia útil" fixo. |
| 5 | Entrar como aluna | Entra nesta entrega, com as regras do SellBridge (seção 11). |
| 6 | Catálogo | O da seção 6, guardado no banco e editável em Configurações. |
| 7 | Quem não consegue entrar | Formulário público "Não consegue entrar?" na tela de login, com link mágico para acompanhar o chamado (seção 7.5). |
| 8 | Assistente | Respostas prontas curadas antes de abrir chamado (FAQ), com ponto de troca para IA no futuro. Sem IA nesta entrega. |
| 9 | Distribuição | Manual por padrão. Opção em Configurações: "Distribuir automaticamente" entre atendentes disponíveis do tema, com limite de chamados por pessoa. |
| 10 | LGPD | Anexos apagados 180 dias depois do encerramento; chamados guardados por 5 anos. Ambos configuráveis. |

## 3. Cargos e permissões

| Permissão | Atendente | Supervisor | Administrador |
|---|---|---|---|
| `support.answer`: ver fila, conversas, responder, nota interna | ✓ | ✓ | ✓ |
| `support.triage`: assumir, devolver, status, prioridade, tema | ✓ | ✓ | ✓ |
| `support.assign_others`: passar chamado de outra pessoa | | ✓ | ✓ |
| `support.ombudsman`: ver e responder a Ouvidoria | | ✓ | ✓ |
| `support.metrics`: Desempenho | | ✓ | ✓ |
| `support.settings`: Configurações do suporte | | | ✓ |
| `support.impersonate`: entrar como aluna | | | ✓ |
| `team.manage`: Equipe | | | ✓ |
| todo o resto do admin de hoje | | | ✓ |

- Papéis novos em `user.role`: `support_agent` e `support_supervisor` (o `admin` continua). Leia e
  escreva só pelas funções de `src/features/admin/access.ts` (o campo aceita vários papéis). Equipe
  que também tem produto continua sendo aluna desse produto.
- Matriz como função pura testada: `src/features/support/staff-access.ts` (`hasStaffPermission`,
  `isStaffRole`, `staffRoleLabel`).
- Guarda `requireStaff(path, permission)` (404 para quem não tem; mesmas regras de banida e senha
  pendente do `requireAdmin`) e `requireStaffAction(permission)` para Server Actions e route handlers.
  A interface só esconde; o servidor decide.
- O layout do admin passa a aceitar equipe. A barra lateral mostra só o que o cargo pode usar. Toda
  página de admin que não é do suporte continua com `requireAdmin`: revise uma por uma e cubra com
  teste de acesso. Atendente que digita `/admin/contas` recebe 404.
- Pessoa bloqueada ou que deixa de ser equipe conta como "sem responsável" na hora: os chamados dela
  voltam para a fila sem migração.
- **Disponibilidade:** cada pessoa da equipe tem "Disponível" / "Em pausa" (chave no topo da fila,
  guardada no banco). Em pausa não recebe distribuição automática. A presença que já existe mostra
  quem está online.

## 4. Onde fica no admin

Novo grupo **"Suporte"** na barra lateral do admin (substitui o item "Suporte" de "Operação"):

- **Chamados** `/admin/chamados`, com contador "N chamados aguardando" (atendente vê só este item).
- **Ouvidoria** `/admin/chamados?fila=ouvidoria` aparece como aba dentro de Chamados, só com
  `support.ombudsman`.
- **Desempenho** `/admin/suporte/desempenho` (`support.metrics`).
- **Equipe** `/admin/suporte/equipe` (`team.manage`).
- **Configurações** `/admin/suporte/configuracoes` (`support.settings`), que absorve a página atual
  `/admin/suporte` ("Contatos por assunto"). Redirecione `/admin/suporte` para Configurações.

No **Painel** do admin (`/admin`), cartão "Suporte agora": aguardando, atrasados, sem responsável,
quem está disponível e "Aberto agora" / "Fora do horário" / "Em pausa", com link para a fila.
Atendente e supervisor que entram no admin caem direto em Chamados.

Atualize `admin-section.ts` (+ teste) com as seções novas.

## 5. Dados (Drizzle)

Arquivo `src/server/db/schema/support-tickets.ts`, reexportado no `index.ts`. Convenções da casa:
snake_case no plural, enums `text(..., { enum })`, `createdAt/updatedAt` com `defaultNow()`, índices
`<tabela>_<coluna>_idx`, FK para `user.id` com `cascade` no dono e **`set null` em toda coluna de quem
agiu ou escreveu** (no SellBridge `author_id` em cascade apaga o histórico quando a conta some; não
repita). Migração com `bun run db:generate` e nome `support-tickets`.

- **`support_tickets`**
  - `id` uuid; `number` serial único (mostrado como "#1042").
  - Solicitante: `requester_id` (set null, pode ser nulo em chamado público), `requester_email`,
    `requester_name` (sempre preenchidos, para o chamado público e para quando a conta some).
  - `subject` (até 120), `status` `open | answered | closed` ("Aguardando suporte", "Respondido",
    "Encerrado"), `queue` `general | ombudsman`, `topic_id`, `situation_id` (null = sem detalhe).
  - `priority` `low | normal | high | urgent` ("Baixa", "Normal", "Alta", "Urgente").
  - `assignee_id` (set null; null = na fila).
  - Relógio: `awaiting_since`, `due_at` (calculado em horas de atendimento e regravado sempre que o
    relógio, a prioridade ou a configuração de horário mudam), `first_response_at`, `closed_at`,
    `closed_reason` `requester | staff | automatic`.
  - Contexto: `product` (`loja-pronta | sll | null`), `lesson_id`, `store_phase` (1–7),
    `error_digest`, `page_path`.
  - Origem: `channel` `platform | public_form`; `email_confirmed_at` (chamado público: quando o
    link mágico foi aberto; da plataforma: a criação); `assistant_answer_id` (resposta do FAQ que ela
    viu antes de abrir).
  - Avaliação: `rating` smallint CHECK 1–5, `rating_comment` (até 1000), `rated_at`.
  - Índices: `(requester_id)`, `(status, assignee_id)`, `(queue, status)`, `(due_at)`,
    `(topic_id, situation_id, created_at)`.
- **`support_ticket_messages`**: `ticket_id`, `author_id` (set null), `author_name` (cópia),
  `from_staff`, `internal`, `body` (10–5000; nota a partir de 2), `created_at`.
- **`support_ticket_attachments`**: `ticket_id`, `message_id`, `storage_key`, `file_name`,
  `mime_type`, `size_bytes` (CHECK ≥ 0), `purged_at`.
- **`support_ticket_events`**: `id` bigint identity, `ticket_id`, `actor_id` (set null),
  `automatic`, `type`, `from_value`, `to_value`, `created_at`. Tipos: `status_changed`,
  `assigned`, `priority_changed`, `topic_changed`, `queue_changed`, `rated`, `deadline_missed`,
  `impersonation_started`. Nomes resolvidos na leitura ("Ex-membro da equipe", "Usuária removida").
- **`support_ticket_reads`**: PK `(ticket_id, user_id)`, `read_at` gravado com `greatest(...)`.
- **`support_access_tokens`**: link mágico do chamado público. `ticket_id`, `token_hash` (sha-256;
  o token puro só vai no e-mail), `expires_at` (7 dias, renovado a cada resposta da equipe),
  `used_at`.
- **`support_topics`** e **`support_situations`**: o catálogo da seção 6 (id estável em slug,
  rótulo, legenda, pergunta, exemplo, dica de anexo, aviso, prioridade, ordem, ativo, responsável
  padrão no tema, `always_human` no FAQ). Seed na migração com os valores da seção 6.
- **`support_settings`** (uma linha): horário por dia da semana, fuso (`America/Sao_Paulo`),
  prazos por prioridade, dias para encerrar automático (7), distribuição automática (bool) e limite
  por pessoa, pausa (`paused_until`, `pause_message`), retenção (anexos e chamados).
- **`support_holidays`**: data e nome. Seed com os feriados nacionais do ano corrente e do próximo.
- **`support_reply_templates`**: título, corpo com `{aluna}`, `{assunto}`, `{atendente}`, status ao
  enviar, ordem, ativo. Seed com os da seção 8.
- **`support_faq_answers`**: id estável, tema, situação (opcional), título, passos (lista), links
  (lista de caminhos internos permitidos), ativo. Seed com a seção 10.
- **`support_known_issues`**: título, texto, temas afetados, `starts_at`, `ends_at`, quem criou.
- **`support_staff_status`**: `user_id` PK, `available` bool, `updated_at`.
- **`support_faq_feedback`**: `answer_id`, `user_id` (set null), `topic_id`, `situation_id`,
  `resolved` bool, `created_at`. Alimenta "quanto o FAQ evitou" no Desempenho.
- **`support_whatsapp_clicks`**: `topic` (assunto do WhatsApp), `source` `platform | login`,
  `user_id` (set null, nulo no login), `created_at`. Sem conteúdo de conversa.

Toda mudança num chamado trava a linha (`select ... for update`) e grava evento na mesma transação.
Na exclusão de conta: apague anexos do bucket, anonimize `requester_name/email` e mantenha o chamado
para as métricas.

## 6. Catálogo de temas e situações (seed)

Ids estáveis; o admin muda rótulos, ordem, prioridade e ativa ou desativa em Configurações.

- **`access` "Entrar na plataforma"** (responsável padrão: Mylena)
  - `cant-login` "Não consigo entrar" (alta)
  - `reset-link` "O link de senha não funciona"
  - `email-not-confirmed` "Não confirmei meu e-mail"
  - `product-missing` "Comprei e não aparece" (alta)
  - `access-expiring` "Meu acesso vai acabar"
- **`lessons` "Aulas do curso"** (Rackel)
  - `video-not-loading` "A aula não carrega"
  - `stage-locked` "Uma etapa não abriu"
  - `lesson-question` "Dúvida sobre o conteúdo"
  - `material` "Material ou calculadora"
- **`store` "Minha Loja Pronta"** (Mylena)
  - `brand` "Nome, logo ou texto da marca"
  - `logo-limit` "Acabaram as criações de logo"
  - `shopee-account` "Conta na Shopee"
  - `phase-waiting` "Quando abre a próxima fase"
- **`shipping` "Envio Velox"** (Nabila)
  - `how-to-start` "Como começar a usar"
  - `label-or-tracking` "Etiqueta ou rastreio"
  - `shipping-question` "Dúvida da aula de envio"
- **`payment` "Pagamento e reembolso"** (sem responsável padrão; `always_human`)
  - `refund` "Quero reembolso"
  - `unknown-charge` "Cobrança que não reconheço" (alta)
  - `invoice` "Nota fiscal"
- **`ombudsman` "Ouvidoria"** (fila restrita; sem situações; `always_human`)
- **`other` "Outra coisa"** (sem situações)

Regras:

- Todo tema com situações ganha no fim "Outro problema" (legenda "Não está na lista acima", id
  `other-issue`, prioridade normal), com a pergunta e o exemplo do tema e dica de anexo "Um print da
  tela onde aparece o problema."
- Escreva pergunta, exemplo e aviso de cada situação em pt-BR simples. Exemplo:
  `video-not-loading` → pergunta "Qual aula e o que aparece na tela?", exemplo "Etapa 2, aula 5: a
  tela fica preta e o vídeo não começa.", dica "Um print da tela da aula."
- `planSupportTicket` (puro, testado) deriva tudo no servidor: recusa tema ou situação inativos ou
  inexistentes; descrição mínima 20 caracteres com situação conhecida e **40** em "Outro problema"
  ou sem situação ("Conte um pouco mais pra gente entender o caso"); prioridade vem da situação (a
  aluna nunca escolhe); fila `ombudsman` para o tema Ouvidoria; assunto
  `"{situação ou tema}: {primeiros 60 caracteres da descrição em uma linha}"`, cortado em 120. O
  cliente e o servidor validam **o mesmo** mínimo (no SellBridge a bolha validava 10 e o servidor
  exigia 40; não repita).
- Texto da plataforma automática: o chamado é "falar com o suporte" para tirar dúvida ou resolver
  problema. "Quando abre a próxima fase" responde com o que a plataforma já mostra ("em breve"), sem
  inventar prazo. Nada de "a equipe monta sua loja".

## 7. Telas da aluna

Rotas no grupo `(member)` com `AreaShell` como o `/perfil` (comum aos dois produtos).

### 7.1 `/suporte`

- Linha de horário em todas as telas da aluna: "Atendimento de segunda a sexta, das 8h às 18h, e
  sábado das 8h às 12h (horário de Brasília)." (gerada da configuração). Fora do horário, numa linha
  própria em cor de texto normal: "Estamos fora do horário. Respondemos a partir de segunda às 8h."
  Em pausa: a mensagem de pausa e os contatos de WhatsApp configurados. Abrir chamado continua
  possível a qualquer hora.
- Aviso de problema conhecido ativo, no topo, com o texto do admin.
- Lista: Assunto / Situação / Última atualização, busca "Buscar pelo assunto", filtro de status, 10
  por página, mais recentes primeiro, marca "Nova resposta". Vazio: "Você ainda não abriu chamados"
  + "Abrir chamado".

### 7.2 `/suporte/novo`

- Um cartão com os passos do SellBridge: "Sobre o que é?" ("Escolha o mais próximo. Dá pra mudar
  depois.") → "O que está acontecendo?" → pergunta guiada com exemplo e aviso. Passos respondidos
  viram resumo com "Alterar o tema" / "Alterar o que está acontecendo"; mudar um passo limpa só o
  que depende dele; o foco vai para o próximo título.
- **Sem JavaScript funciona:** os campos aparecem como selects e textarea num `<form action>`. Com JS
  é guiado.
- **Antes de enviar (assistente):** se a situação tem resposta no FAQ e não é `always_human`, mostre
  o cartão "Talvez isto resolva" com título, passos e links, e dois botões: "Resolveu" (não abre
  chamado; registra que a resposta ajudou) e "Ainda preciso de ajuda" (segue para o envio e grava
  `assistant_answer_id` no chamado, que a equipe vê).
- **Chamado parecido aberto:** se ela já tem chamado aberto ou respondido no mesmo tema e situação,
  mostre "Você já tem um chamado sobre isso" com link, e a opção "Abrir mesmo assim".
- **Problema conhecido** que afeta o tema escolhido aparece antes do envio.
- **Contexto pela URL:** `?tema=&situacao=&aula=&fase=&erro=&pagina=`. O servidor confere cada
  valor (aula existe, fase 1–7, produto da aluna) antes de gravar. Mostra "O chamado vai junto com"
  e a prévia ("Aula 12 · Etapa 2 do SLL").
- Rodapé "O que acontece depois": a promessa calculada da configuração ("Respondemos em até 8 horas
  de atendimento. A resposta chega por e-mail e aqui no suporte."); em prioridade alta, antes:
  "Casos como o seu são respondidos primeiro."; fora do horário, a linha "Estamos fora do horário…".
- Botão "Enviar chamado". Sucesso: vai para a conversa com aviso "Chamado enviado. Avisamos quando o
  suporte responder." Erro: a mensagem + " O que você escreveu continua aqui." (`submitWithoutReset`
  de `src/lib/forms.ts`).
- Limite: 5 chamados novos por dia por aluna e no máximo 3 abertos ao mesmo tempo (fora Ouvidoria),
  com `consumeAttempt`. Mensagem: "Você já tem 3 chamados abertos. Responda um deles ou espere a
  resposta."

### 7.3 `/suporte/[numero]`

- **Linha de situação** (do SellBridge `customer-ticket-states`), uma frase só:
  - esperando: "O suporte responde até hoje às 15:00." (prazo real em horário de atendimento);
  - fora do horário: "O suporte responde a partir de segunda às 8h.";
  - atrasado: "A resposta está a caminho: o suporte já está cuidando." (nunca mostre hora no
    passado);
  - respondido: "O suporte respondeu. Sem retorno seu, o chamado é encerrado em {data}.";
  - encerrado por ela, pela equipe ou automático, cada um com sua frase.
- Conversa com mensagens e eventos visíveis: "{Nome} está cuidando do seu chamado", "{Nome} encerrou
  o chamado", "Chamado reaberto", "Chamado encerrado automaticamente por falta de retorno", "Tema
  alterado para …", "Atendimento avaliado com N de 5". Prioridade, fila, prazo perdido e "voltou para
  a fila" não aparecem para ela. Foto ou iniciais de cada autor.
- Recibo sob a última mensagem dela: "Visto pelo suporte" ou "Enviado · ainda não visto pelo
  suporte".
- Sob a última resposta, só com status respondido: **"Sim, resolveu"** encerra, com 5 segundos para
  desfazer; **"Ainda não"** envia "Ainda não resolveu." na hora e devolve o chamado para
  "Aguardando suporte" (não só preenche a caixa: no SellBridge isso deixava o chamado fechar sozinho
  com a cliente achando que tinha avisado).
- Resposta: "Escreva sua resposta para o suporte…", Ctrl/Cmd+Enter envia, colar print e arrastar
  arquivos, atalhos "Segue o print" e "Ainda não resolveu". Rascunho no `localStorage`
  (`escalashop:ticket-draft:{id}`, 600 ms, "Salvando rascunho…"/"Rascunho salvo", apagado ao enviar,
  erros de storage ignorados). Em encerrado: "Responder reabre o chamado".
- "Seu problema foi resolvido?" + "Encerrar chamado"; depois, avaliação de 1 a 5 com comentário
  opcional e "Enviar avaliação", uma vez por encerramento.
- "Receber respostas por e-mail" (liga e desliga) e "Imprimir ou salvar em PDF".

### 7.4 Entradas

- Menu da conta: "Suporte no WhatsApp" continua igual; entra acima dele "Meus chamados" com
  contador "N chamados com resposta nova".
- `/perfil#suporte` (`HelpGroup`): as linhas de WhatsApp por assunto continuam como estão; entram
  acima "Abrir chamado" e "Meus chamados".
- `TalkToTeam` da Loja Pronta: o botão "Suporte no WhatsApp" continua igual; ao lado ou abaixo
  entra o link "ou abra um chamado" → `/suporte/novo?tema=store&fase=N`.
- Página da aula → "Problema com esta aula?" → `/suporte/novo?tema=lessons&aula={id}`.
- Páginas de erro (`src/app/error.tsx`, `global-error.tsx`) → "Falar com o suporte" →
  `/suporte/novo?tema=access&erro={digest}&pagina={caminho}`. A frase atual "fale com o suporte"
  continua.
- Aviso de acesso vencendo: mantém o WhatsApp de hoje (`TEAM_WHATSAPP`) e ganha "ou abra um chamado"
  → `/suporte/novo?tema=access&situacao=access-expiring`.

### 7.6 WhatsApp junto dos chamados (cuidado)

O WhatsApp é um canal que a aluna já conhece e usa. Ele **continua funcionando exatamente como
hoje**; os chamados entram ao lado, não no lugar.

- **Não remova nem mude** `SUPPORT_TOPICS`, `support_contacts`, `parseSupportPhones`,
  `getSupportPhones`, `saveSupportContacts`, o `HelpGroup`, o item do menu da conta, o
  `TalkToTeam`, o `TEAM_WHATSAPP` nem a mensagem pré-preenchida. O teste
  `e2e/support-contacts.spec.ts` e o `contacts.test.ts` continuam passando (ajuste só o caminho da
  página se ela mudar de endereço, mantendo o redirecionamento).
- Os assuntos do WhatsApp (`technical`, `lessons`, `shipping`, `ombudsman`) e os temas dos chamados
  (seção 6) são coisas diferentes. Ligue-os por um mapa explícito e testado
  (`access`/`store` → `technical`, `lessons` → `lessons`, `shipping` → `shipping`, `ombudsman` →
  `ombudsman`; `payment` e `other` sem WhatsApp). Não renomeie os ids antigos.
- Onde o WhatsApp aparece nas telas novas, sempre como **segunda opção**, em link discreto:
  - `/suporte`: bloco "Prefere conversar?" com os contatos configurados ("Chamar a Rackel" etc.).
  - `/suporte/novo`: depois de escolher o tema, se ele tem contato, uma linha "Prefere conversar?
    Chame a {Nome} no WhatsApp".
  - `/suporte/acesso` (público): "Prefere conversar? Chame no WhatsApp", usando o contato de
    `technical`.
  - Suporte em pausa: os contatos aparecem junto da mensagem de pausa.
  - Nunca na conversa de um chamado (dividiria a mesma conversa em dois lugares).
- Assunto sem número continua como hoje: "{Nome} · Em breve", sem link.
- A mensagem pré-preenchida do WhatsApp não leva dado da aluna além do que já leva hoje. Nada de
  texto do chamado, número de pedido ou e-mail na URL do `wa.me`.
- Sem automação de WhatsApp: nada de API, robô ou envio automático (o `PRODUTO.md` diz que isso não
  existe). O WhatsApp continua sendo só um link que abre a conversa.
- **Medir sem invadir:** os links de WhatsApp **das telas novas** passam por
  `/suporte/whatsapp/{assunto}`, que conta o clique (assunto, data e se veio da plataforma ou do
  login; sem conteúdo) e redireciona para o `wa.me` com a mesma mensagem que o `HelpGroup` usa. Os
  links que já existem continuam apontando direto para o `wa.me`, como hoje. O Desempenho mostra "Cliques no WhatsApp por assunto" (dica: "Conta só os cliques feitos nas telas de suporte e no login.") para comparar
  os dois canais. Se o assunto não tem número, a rota mostra "Em breve" em vez de redirecionar.
- A frase de horário vale para os dois canais: perto dos links de WhatsApp, a mesma linha de horário
  de atendimento.

### 7.5 Quem não consegue entrar (formulário público)

- Na tela de login e nas telas de senha: link "Não consegue entrar? Fale com o suporte" →
  `/suporte/acesso` (pública).
- Campos: Nome, E-mail da compra, situação (as do tema `access`), descrição, anexo opcional.
  Funciona sem JS. Limite por IP e por e-mail com `consumeAttempt` (3 por hora). Resposta sempre
  igual, exista a conta ou não: "Recebemos. Enviamos um link para {e-mail} para você acompanhar o
  chamado." (não revele se o e-mail tem conta).
- Cria o chamado com `channel = public_form`, liga ao usuário se o e-mail bater com uma conta, e
  manda e-mail com **link mágico** (`/suporte/acesso/{token}`) que abre só aquele chamado, sem login,
  por 7 dias (renovado a cada resposta da equipe). O link prova que ela lê o e-mail. Nessa visão não
  há menu, nem outros chamados, nem dados da conta.
- **Cuidado com quem se passa por outra pessoa:** qualquer um pode digitar o e-mail de outra aluna.
  Até o link mágico ser aberto pela primeira vez (`email_confirmed_at` no chamado), a equipe vê o
  aviso "E-mail ainda não confirmado: não altere nada na conta por este chamado". Nenhuma mudança de
  conta (e-mail, senha, acesso) é feita a partir de chamado público sem e-mail confirmado. A
  aluna não vê, na conta dela, chamado público com e-mail não confirmado.
- Os contatos de WhatsApp configurados aparecem nessa página como "Prefere conversar? Chame no
  WhatsApp".

## 8. Telas da equipe

### 8.1 `/admin/chamados`

- Título "Chamados", descrição "Pegue os chamados sem responsável e responda dentro do prazo de cada
  prioridade." No topo: chave "Disponível / Em pausa" e, para quem tem `support.metrics`, abas
  "Fila · Desempenho".
- Abas da fila com contagem: "Todos", "Sem responsável", "Minha caixa", "Atrasados" e, com
  `support.ombudsman`, "Ouvidoria". Chamados da Ouvidoria **não** aparecem nas outras abas.
- Filtros na URL, sem JS: busca "Buscar por assunto, aluna, e-mail ou mensagem" (procura dentro das
  mensagens também), status, prioridade, tema, responsável, canal (plataforma ou formulário público).
- Ordem: Atrasados por `due_at` crescente; o resto por status (aberto primeiro), prioridade
  decrescente, `due_at` crescente.
- Colunas: Nº / Assunto (com "Mensagem nova", escondido em encerrado) / Aluna / Prioridade /
  Responsável / Status / Prazo / Atualizado. Lista no celular.
- Prazo: "Vence em 3 h" (destaque quando falta menos de 1 hora de atendimento), "Atrasado 40 min",
  "Pausado: fora do horário". Status sempre escrito.
- Vazios: "Nenhum chamado esperando alguém", "Sua caixa está vazia", "Nada atrasado", "Nenhum
  chamado".
- `AutoRefresh` de 30 s. Exportar CSV com os filtros atuais (como Leads), só para supervisor e admin.

### 8.2 `/admin/chamados/[numero]`

- Cabeçalho com status, prioridade, prazo, canal e "{tema} · {situação} · aberto {data}".
- Conversa com notas internas ("Nota interna · {Nome}"), "Citar mensagem" ("> Nome escreveu:") e quem
  leu cada mensagem.
- Composer:
  - "Respostas prontas" (da tabela; `{aluna}`, `{assunto}`, `{atendente}`), seed: "Saudação",
    "Recebemos e estamos analisando" (→ respondido), "Pedir mais detalhes" (→ respondido), "Ajuste
    feito na sua conta" (→ respondido), "Resolvido, encerrando" (→ encerrado), "Assinatura".
  - Anexos. Chave "Nota interna" ("Nota interna · só a equipe vê", "Contexto para a equipe: o que
    foi verificado, próximos passos…").
  - Envio: "Enviar e marcar respondido" (padrão), "Enviar e manter aguardando", "Enviar e
    encerrar"; mais "Encerrar sem responder". Contador a partir de 4000/5000. Ctrl+Enter envia.
  - Em encerrado: aviso com "Reabrir chamado" e "Nota interna".
- Painel "Atendimento": Responsável (supervisor/admin: select da equipe + "Sem responsável";
  atendente: "Assumir chamado" ou "Você" + "Devolver para a fila"), Prioridade, Tema e situação,
  Fila (mover para Ouvidoria e de volta, só com `support.ombudsman`), Prazo (ou "Aguardando a
  aluna", "Encerrado"), Primeira resposta, Avaliação, resposta do FAQ que ela viu antes de abrir, e
  histórico ("Ana assumiu o chamado", "devolveu para a fila", "passou para X", "prioridade Normal →
  Alta", "prazo perdido", "Encerrado automaticamente por falta de retorno").
- Painel da aluna: foto, nome, e-mail com "Copiar e-mail", produtos e validade de cada acesso,
  compra e reembolso na Hotmart, fase da Loja Pronta, última aula vista no SLL, último acesso e se
  está online agora, outros 5 chamados dela com "Ver todos", "Ver conta" (admin) e "Entrar como
  aluna" (`support.impersonate`, seção 11).
- Contexto do chamado: aula (com link para a aula), fase, página e código do erro.

### 8.3 Desempenho `/admin/suporte/desempenho`

Siga o `docs/prompts/desempenho-do-suporte.md` do SellBridge (branch `feat/support-performance`),
adaptado:

- Três perguntas, nesta ordem: **a equipe dá conta?**, **resolve de verdade?**, **quem precisa de
  apoio, e em quê?**, e também **do que as alunas mais reclamam?**.
- Seções na URL: `secao` geral|equipe|assuntos, `dias` 7|30|90 (padrão 30), `grafico`
  volume|resposta|horarios, `pessoa` id, `origem` todos|loja-pronta|sll.
- **Visão geral:** 4 blocos (Resolvidos, Primeira resposta em mediana, Sem reabrir, Nota com taxa de
  avaliação), cada um com a variação contra o período anterior. Gráfico com três vistas: entrou ×
  saiu (por dia em 7 dias, por semana em 30/90), mediana da primeira resposta, e mapa de horários
  (dia da semana × hora dentro do horário de atendimento, mais uma coluna "fora"). Cartões:
  "Assuntos que mais geram chamados", "Equipe" (sem número de posição, ordenada por situação) e
  "Precisa de você" (fora do prazo, sem responsável, assunto disparando (+3 e +50%), pessoa
  precisando de apoio, "Outro problema" ≥ 20% de um tema, FAQ com muitos "Ainda preciso de ajuda").
- **Equipe:** Pessoa, Situação, Resolvidos, Por dia ativo, Primeira resposta, No prazo, Sem reabrir
  (com o esperado), Nota, Com a pessoa. Linha final com a equipe.
- **Assuntos:** tema e situação com Chamados, Antes (período anterior), Até resolver, Sem reabrir,
  Nota, e quanto o FAQ evitou (respostas "Resolveu").
- **Ficha da pessoa:** frase-resumo, 4 blocos comparados à equipe, resolvidos por semana com a média
  da equipe tracejada, Agora, Por assunto e Avaliações de 1 a 3.
- Regras (funções puras testadas em `src/features/support/performance/`):
  - Resolvido = evento `status_changed → closed` no período (reaberto e fechado de novo conta duas
    vezes).
  - Quem resolveu = autor da última resposta pública da equipe antes do encerramento (vale no
    automático).
  - Voltou = reaberto em até 7 dias, ou a mesma aluna abriu outro chamado no mesmo tema e situação
    em até 7 dias sobre a mesma coisa (mesma aula ou mesma fase).
  - Primeira resposta e No prazo medidos em **horas de atendimento**, a mesma régua do prazo.
  - Nota creditada a quem resolveu; mostrar a taxa de avaliação.
  - Dias ativos = dias com ao menos uma resposta pública.
  - Comparação justa: "sem reabrir" de cada pessoa contra o esperado para a mistura de assuntos dela.
  - Menos de 5 resolvidos: sem cor, "poucos chamados". Porcentagem sempre com o número na dica ("82%
    de 17").
  - Situação da pessoa: "N fora do prazo" → "Poucos chamados" → "Precisa de apoio" (no prazo < 80%
    ou sem reabrir 5 p.p. abaixo do esperado) → "Acima da equipe" (no prazo ≥ 92% e sem reabrir ≥
    esperado + 3 p.p.) → "Na média".
  - "Em experiência" = menos de 90 dias na equipe.
- A situação "Precisa de apoio" é só para supervisor e admin. Atendente não vê Desempenho.
- Estados de carregando, erro e vazio. No celular tudo empilha e as tabelas rolam dentro do cartão.
  Gráficos com os componentes que já existem no admin; se não houver, barras simples em HTML/CSS com
  tokens (nada de biblioteca nova sem necessidade).

### 8.4 Equipe `/admin/suporte/equipe`

- Lista Pessoa / Cargo / Situação ("Ativa", "Convite enviado", "Bloqueada") / Disponibilidade /
  Último acesso / Chamados com a pessoa. O nome abre a ficha no Desempenho.
- "Convidar para a equipe": Nome, E-mail, Cargo, com as descrições:
  - Atendente: "Responde e organiza chamados."
  - Supervisor: "Também distribui chamados, cuida da Ouvidoria e vê o desempenho do suporte."
  - Administrador: "Faz tudo, inclusive cuidar das contas das alunas e das configurações."
- O convite cria a conta e manda link de criar senha (1 hora), reaproveitando o fluxo de senha que
  já existe. Conta que já existe só recebe o cargo. Mudar cargo, bloquear e tirar da equipe, com
  confirmação (`AdminConfirmation`).

### 8.5 Configurações `/admin/suporte/configuracoes`

Seções, cada uma com seu formulário (sem JS funciona):

- **Horário de atendimento:** por dia da semana, abre e fecha (ou "Fechado"). Feriados (lista,
  adicionar e remover). Prévia da frase que a aluna vê.
- **Pausa:** "Pausar o suporte até {data}" com mensagem; enquanto pausado, os prazos não correm.
- **Prazos por prioridade** em horas de atendimento. Dias até encerrar automático.
- **Temas e situações:** editar rótulos, perguntas, exemplos, prioridade, ordem, ativo, e a
  responsável padrão do tema.
- **Distribuição:** "Distribuir automaticamente" e limite de chamados abertos por pessoa.
- **Respostas prontas:** criar, editar, ordenar, desativar.
- **Respostas do assistente (FAQ):** criar, editar, desativar; ver quantas vezes cada uma resolveu.
- **Avisos de problema conhecido:** criar com período e temas afetados; encerrar.
- **Contatos de WhatsApp:** o formulário atual de "Contatos por assunto", sem mudar campos, regras
  nem mensagens; com uma prévia de onde cada contato aparece.
- **Guarda de dados:** dias para apagar anexos depois do encerramento, anos para guardar chamados.

## 9. Ouvidoria

- Fila `ombudsman`, visível e respondível só com `support.ombudsman` (supervisor e admin). Atendente
  não vê nem pela busca, nem pelo número na URL (404).
- Fica fora do Desempenho por pessoa (aparece só no total), para ninguém ser avaliado por reclamação
  sobre si.
- Chamado de outro tema pode ser movido para a Ouvidoria e vice-versa, com evento `queue_changed`.

## 10. Assistente (FAQ antes do chamado)

- Ponto de troca como no SellBridge (`feat/support-assistant`): `SupportAssistant.answer(question)`
  devolve `{ kind: 'answer', answer }` ou `{ kind: 'needs_human', reason }` (`always_human`,
  `no_match`, `not_configured`, `failed`). Implementação desta entrega: `faq` (lê
  `support_faq_answers`). Deixe o tipo pronto para um provedor de IA depois, sem implementar.
- `always_human`: temas Pagamento e Ouvidoria, e a situação `product-missing`.
- O servidor reconstrói a resposta pelo id; nunca confia no texto vindo do navegador.
- Seed (passos curtos, links só para páginas que existem):
  - `reset-link`: pedir um link novo em "Esqueci minha senha"; o link vale 1 hora; olhar o spam.
  - `email-not-confirmed`: reenviar a confirmação; olhar spam e promoções.
  - `video-not-loading`: atualizar a página, testar outro navegador, desligar bloqueador, conferir a
    internet.
  - `stage-locked`: as etapas abrem em ordem; terminar as aulas da etapa anterior.
  - `logo-limit`: o limite de 4 criações e 10 envios por conta; usar um logo enviado.
  - `phase-waiting`: o painel mostra o que já está liberado; as próximas fases aparecem como "em
    breve".

## 11. Entrar como aluna

Regras do SellBridge (`feat/support-impersonation-v2`), com o plugin admin do better-auth:

- Botão "Entrar como aluna" no painel do chamado e na conta da aluna (`support.impersonate`), com
  confirmação "Você vai ver a plataforma como {nome} por 1 hora. Tudo fica registrado."
- Sessão de 1 hora. Faixa fixa no topo, em toda página: "Você está usando a conta de {nome} até
  HH:MM. Tudo o que fizer fica registrado com o seu nome." + "Voltar ao admin" (alvo de 44 px),
  voltando para a página de onde saiu.
- Bloqueado durante a visita: trocar senha, e-mail ou foto, apagar a conta, aceitar termos, gerar
  logo (custa crédito), encerrar ou avaliar chamado como a aluna. O servidor recusa, não só a tela.
- Toda ação de escrita durante a visita é registrada (evento `impersonation_started` no chamado de
  origem e um log por ação). Marcar como lido durante a visita não conta.
- Contas da equipe não podem ser visitadas.

## 12. Máquina de estados, prazos e responsável

Funções puras testadas em `src/features/support/ticket-rules.ts` e `support-hours.ts`:

- **Mensagem da aluna:** status → `open` de qualquer status (inclusive encerrado). Reabrir limpa
  avaliação e `closed_at`.
- **Resposta pública da equipe:** status → o escolhido (padrão `answered`; ou `open`, `closed`).
  Recusada em encerrado: "Reabra o chamado antes de responder".
- **Nota interna:** não muda status; vale em qualquer status.
- **Status sem mensagem:** só reabrir ou encerrar; nunca "respondido" sem resposta.
- **Aluna encerra** de qualquer status aberto; avaliar exige encerrado e sem nota ("Você já avaliou
  este atendimento").
- **Relógio:** `awaiting_since` começa na criação e a cada mensagem da aluna (mantém se já tiver);
  nota não mexe; qualquer resposta pública da equipe zera; reabrir liga de novo; encerrar zera.
- **Prazo:** `due_at = awaiting_since + prazo da prioridade`, contado **só dentro do horário de
  atendimento**, pulando feriados e a pausa. `addSupportHours(start, hours, settings, holidays)` e
  `supportHoursBetween(start, end, ...)` puros, testados com virada de dia, fim de semana, feriado,
  pausa, horário de verão inexistente (Brasília é UTC−3 fixo) e data inválida (erro, nunca chute).
  Atrasado = `status = open` e `due_at < agora`.
- **Responsável:** a primeira resposta pública de quem não é a responsável ativa assume o chamado.
  Sem `support.assign_others`, só assume chamado sem responsável ativo ou devolve o próprio ("Só
  supervisores podem passar chamados de outra pessoa"). Responsável precisa ser equipe ativa ("Escolha
  alguém da equipe de suporte"). Na criação: responsável padrão do tema, se ativa e disponível; senão,
  distribuição automática (se ligada) para a atendente disponível do tema com menos chamados abertos,
  respeitando o limite; senão, fila.
- `first_response_at` na primeira resposta pública.
- Chamado de outra aluna ou de fila sem permissão: 404 "Chamado não encontrado".

## 13. Anexos

- Até 3 arquivos de 5 MB por mensagem; PNG, JPEG, WEBP e PDF, conferidos pelos bytes. Imagem até 64
  megapixels e 16384 px por lado. HEIC recusado com "Tire um print dela e envie o print."
- Envio com arquivo por route handler com `readLimitedFormData` (3 × 5 MB + 256 KB) e checagem de
  sessão e permissão dentro dele. Sem arquivo pode ser Server Action.
- Nome higienizado; chave `support/{ticketId}/{uuid}-{nome}`. Confira o chamado antes de gravar no
  bucket; se o banco falhar, apague o que gravou.
- Limite: 30 mensagens com arquivo em 10 minutos por conta (`consumeAttempt`).
- Recusas no navegador, uma frase por arquivo: repetido, HEIC, tipo errado, grande demais, já tem 3.
- Download por rota privada: dona do chamado (ou link mágico válido) ou equipe com acesso à fila;
  anexo de nota interna nunca para a aluna; `?inline=1` só para imagem; `nosniff`, `private,
  no-store`.
- Aviso discreto no campo de anexo: "Não envie foto de documento nem dados de cartão."

## 14. Avisos e tarefas automáticas

E-mail: generalize `src/server/auth/emails.ts` num módulo de e-mail com idempotência e builders puros
testados. Falha no envio é registrada e nunca derruba a ação.

- **Para a aluna**, a cada resposta pública (nunca nota): "Nova resposta no seu chamado:
  {assunto}", botão "Ler a resposta" (link mágico no chamado público). O texto da resposta não vai no
  e-mail. Respeita "Receber respostas por e-mail".
- **Para a responsável**, quando a aluna responde um chamado dela (no SellBridge ninguém era avisado;
  aqui é). Sem responsável: não manda.
- **Para a equipe**, chamado novo sem responsável: e-mail para atendentes disponíveis do tema (ou
  toda a equipe disponível), uma vez por chamado. Ouvidoria: só para quem tem `support.ombudsman`.
- **Prazo perdido:** quando um chamado atrasa, evento `deadline_missed` e e-mail para a responsável e
  para os supervisores, uma vez por atraso.
- **Resumo diário** para supervisores às 8h: aguardando, atrasados, sem responsável, nota de ontem.
- **Dentro da plataforma:** contadores (menu da conta para a aluna; barra lateral para a equipe) e
  "Nova resposta"/"Mensagem nova" nas listas. Sem sino.
- **Tarefas no worker** que já existe (`scripts/run-assistant-worker.ts`), como tarefas periódicas no
  mesmo loop e heartbeat, com trava para rodar uma vez só mesmo com dois processos:
  - a cada hora: encerrar respondidos parados há N dias **de calendário** (`closed_reason =
    automatic`, evento sem autor, em lotes);
  - a cada 5 minutos: marcar prazos perdidos e mandar os avisos;
  - todo dia: resumo das 8h, apagar anexos vencidos (`purged_at`), anonimizar chamados vencidos,
    expirar links mágicos.
- **Marcar como lido** quando a mensagem mais nova aparece na tela, mandando o id dela.
- **Atualização:** conversa a cada 15 s, listas a cada 30 s, Desempenho e cartão do Painel a cada
  60 s, com o `AutoRefresh`.

## 15. Regras da casa

- Interface 100% em pt-BR (inclusive admin, títulos, rótulos acessíveis, erros, vazios, e-mails).
  Código, docs internos, commits e PRs em inglês. Português simples, frases curtas.
- **Plataforma automática:** suporte é tirar dúvida e resolver problema; nenhum texto promete que
  alguém faz a loja ou a tarefa pela aluna.
- Nada de fake: o que não funciona aparece "Em breve", sem botão que finge.
- Visual: só tokens do `globals.css`, `rounded-card`, `shadow-card`, `Button` `rounded-full`,
  `FloatingLabelInput`, ícones lucide com `aria-hidden`, corpo 17 px e nada abaixo de 16 px, uma
  decisão por tela. `src/design-guard.test.ts` passa sem mudar o teste.
- WCAG 2.2 AA nos dois temas: teclado, foco visível, alvos de 44 px, `prefers-reduced-motion`,
  `forced-colors:`, leitor de tela, erros com `role="alert"` e `aria-describedby`, status escrito e
  não só por cor. Formulários funcionam sem JavaScript.
- Código de servidor não vai para o navegador (`.oxlintrc.json`). Se precisar liberar outro arquivo
  de `server/`, mude a lista de propósito e explique no comentário.
- Funções puras fora de `server/`, com `*.test.ts` ao lado. Comentários em português dizendo o
  porquê. Logs sem dados pessoais. Segredos e configuração por variável de ambiente.
- Strict TypeScript, retorno antecipado, sem `else`, null checks, imutabilidade, erros tipados.

## 16. Ordem de execução (todas em sequência, sem parar)

1. **Base:** schema e migração com seeds (catálogo, configurações, feriados, respostas prontas, FAQ),
   matriz de permissões, `requireStaff`, regras puras (`ticket-rules`, `support-hours`,
   `planSupportTicket`) com testes.
2. **Equipe e admin:** grupo "Suporte" na barra lateral, layout aceitando equipe, revisão de acesso de
   todas as páginas do admin, tela Equipe com convite, disponibilidade.
3. **Chamado ponta a ponta:** aluna abre (guiado, sem JS também), conversa, encerra e avalia; equipe
   vê a fila, responde, nota interna, respostas prontas, citar, triagem e histórico.
4. **Fila completa:** abas, Ouvidoria, filtros, busca nas mensagens, prazos em horário de
   atendimento, atrasados, distribuição automática, CSV.
5. **Anexos.**
6. **Horário, pausa, problemas conhecidos e Configurações** (todas as seções da 8.5), com a migração
   da página `/admin/suporte` atual.
7. **Assistente FAQ** antes do chamado e aviso de chamado parecido.
8. **Formulário público com link mágico** e entradas (menu da conta, Perfil, Loja Pronta, aula,
   páginas de erro, aviso de acesso), com o WhatsApp mantido em todas elas como hoje e a rota de
   clique `/suporte/whatsapp/{assunto}` (seção 7.6). Rode `e2e/support-contacts.spec.ts` nesta fase.
9. **E-mails e tarefas do worker.**
10. **Desempenho** e cartão "Suporte agora" no Painel.
11. **Entrar como aluna.**
12. **Fechamento:** e2e do fluxo inteiro (aluna abre → FAQ → envia → atendente assume → nota →
    responde → aluna "Ainda não" → volta à fila → responde → "Sim, resolveu" → avalia → aparece no
    Desempenho), axe em todas as telas novas nos dois temas e tamanhos, script `bun run dev:equipe
    <email> <senha> --cargo=atendente|supervisor` para teste local, `docs/SUPORTE.md`, revisão final
    do próprio diff e lista do que ficou de fora (se algo ficou). Confira também que o WhatsApp
    continua igual em todos os lugares de antes (seção 7.6) e que a Política de Privacidade cita os
    dados do suporte (mensagens, anexos e prazos de guarda); se não citar, ajuste o texto.

## 17. O que não copiar do SellBridge

- Organização/tenant, pedidos vinculados, loja e anúncio, seguidores, perfis revendedor/fornecedor.
- Coluna de prazo sem uso; prazo em horas corridas com promessa em "dia útil".
- `author_id` em cascade; limite de envio em memória; bolha flutuante com validação diferente do
  servidor.
- "Modo administrador" por cookie (no Prime o admin é uma área separada) e sino de notificações.
- BullMQ (use o worker e a fila em tabela que já existem).
