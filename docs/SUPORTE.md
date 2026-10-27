# Support tickets

In-platform support with roles, queues, business-hour deadlines and monitoring, modeled on the
SellBridge support (see `docs/PROMPT-SUPORTE-CHAMADOS.md` for the full spec and the decisions).
The WhatsApp contacts per topic keep working exactly as before; tickets sit next to them.

## Where things live

| What | Where |
|---|---|
| Pure rules (tested) | `src/features/support/`: `staff-access.ts`, `catalog.ts`, `plan-ticket.ts`, `ticket-rules.ts`, `support-hours.ts`, `copy.ts`, `attachments.ts`, `faq.ts`, `reply-templates.ts`, `whatsapp.ts`, `email-messages.ts` |
| Performance rules (tested) | `src/features/support-desk/performance.ts` |
| Settings input parsing (tested) | `src/features/support-admin/settings-input.ts` |
| Data | `src/server/db/schema/support-tickets.ts`, migration `drizzle/0066_support-tickets.sql` |
| Ticket repository (locks, events, deadlines) | `src/features/support/server/tickets.ts` |
| Student actions / staff actions / admin actions | `src/features/support/server/actions.ts`, `src/features/support-desk/server/actions.ts`, `src/features/support-admin/server/actions.ts` |
| Routes with attachments | `src/app/api/suporte/chamados/route.ts`, `src/app/api/suporte/chamados/[numero]/mensagens/route.ts`, `src/app/api/suporte/anexos/[id]/route.ts`, `src/app/api/suporte/acesso/route.ts` |
| Worker tasks | `src/features/support/server/maintenance.ts`, called from `scripts/run-assistant-worker.ts` |

## Screens

Student (member area, shared by both products):

- `/suporte`: tickets list, business hours, known-issue notices, WhatsApp as second option.
- `/suporte/novo`: guided ticket (topic → situation → question), FAQ answer before sending,
  duplicate warning, context from the URL (`tema`, `situacao`, `aula`, `fase`, `erro`, `pagina`).
  Without JavaScript it falls back to plain selects.
- `/suporte/<number>`: conversation, state line, "Sim, resolveu" (5 s undo), "Ainda não"
  (replies and returns the ticket to the queue), rating, draft in `localStorage`.
- `/suporte/acesso` (public, linked from the login page): help for people who cannot sign in. It
  emails a magic link (`/suporte/acesso/<token>`, 7 days, renewed on each staff reply). The same
  answer is shown whether or not the email has an account.
- `/suporte/whatsapp/<topic>`: counts the click (no content) and redirects to `wa.me` with the
  same message as the profile. Only links on the new screens use it.

Staff (admin frame, menu filtered by role):

- `/admin/chamados`: queues (Todos, Sem responsável, Minha caixa, Atrasados, Ouvidoria),
  GET filters, availability toggle, CSV export (`/admin/chamados/exportar`, metrics only).
- `/admin/chamados/<number>`: thread with internal notes and quoting, composer with reply
  templates and send status, triage (assignee, priority, topic, queue), requester panel,
  "Entrar como aluna" (administrators only; also on `/admin/contas/<id>`).
- `/admin/suporte/desempenho`: performance (overview, team, topics, person card).
- `/admin/suporte/equipe`: team list, invite, role change, block.
- `/admin/suporte/configuracoes`: hours, holidays, pause, deadlines, distribution, topics,
  reply templates, FAQ answers, known issues, WhatsApp contacts, data retention.
  `/admin/suporte` redirects here.
- Member area account menu: staff (any support role or admin) get "Painel de suporte" as the first
  item, with the waiting count, linking to `/admin/chamados`. Students never see it.
- `/admin`: "Suporte agora" card. Agents and supervisors who open `/admin` land on the queue.

## Roles

`user.role` keeps comma-separated roles. New values: `support_agent` ("Atendente") and
`support_supervisor` ("Supervisor"); `admin` keeps every permission. The matrix is in
`staff-access.ts`; every page and action checks it on the server (`requireStaff`,
`readStaffSession`). Inviting, changing a role and blocking also need the **platform owner**: an
administrator with a verified email listed in `PLATFORM_OWNER_EMAILS` (`isPlatformOwner` in
`staff-access.ts`). An owner cannot be changed from the team screen, only from the configuration,
and only staff accounts can be blocked there. Every non-support admin page still uses `requireAdmin`, so agents and
supervisors get 404 there. Create local staff with `bun run dev:equipe <email> <senha> --cargo=atendente|supervisor|admin`.

## Rules worth knowing

- No minimum length for the ticket description or the public form: only empty text is refused.
  The guided question and its example already help, and the old 20/40 character lock only slowed
  students down (owner's decision, 27/10/2026).

- Deadlines count only business hours (weekly hours, holidays and pause from the settings;
  Brasília is UTC−3 fixed). `due_at` is stored and recomputed when the clock, the priority or the
  settings change.
- Topics belong to a product (`TOPIC_PRODUCT` in `catalog.ts`): lessons and Envio Velox are SLL,
  "Minha Loja Pronta" is Loja Pronta, the rest are shared. Students only see (and the server only
  accepts) topics of products they own; with no product they see every topic. The ticket's
  `product` comes from the lesson or phase context, then the topic, then the student's only
  product. The queue filters by it (`produto`).
- The deadline state comes from `responseTiming` (`none`, `on_time`, `overdue`) and the time bar
  from `responseWindowUsed` (0 to 1, counting business hours only), both in `ticket-rules.ts`. The
  queue badge and `isOverdue` are built on them.
- Auto-close counts from the last **public** staff reply (`autoCloseDate`), not from `updated_at`:
  internal notes and triage changes do not postpone it. The job (`closeIdleTickets`) and the
  student's state line use the same rule, and the job checks again with the row locked.
- "Nova resposta" comes only from `support_ticket_reads`, also on closed tickets (a reply sent with
  "Enviar e encerrar" is still new to the student). The unread subqueries name the table on the
  ticket id (`TICKET_ID`): in a single-table select Drizzle writes a bare `"id"`, which the
  subquery would read as the message id. They also cut the message time to milliseconds, the
  precision of the read time.
- Any public staff reply stops the clock, including "Enviar e manter aguardando".
- The first public reply by someone who is not the active assignee takes the ticket.
- Ombudsman tickets live in their own queue, visible only with `support.ombudsman`, and stay out of
  the per-person performance.
- Public-form tickets show "E-mail ainda não confirmado" to staff until the magic link is opened;
  they do not appear in the student's account before that.
- Attachments: up to 3 files of 5 MB, PNG/JPEG/WEBP/PDF checked by magic bytes, stored under
  `support/<ticket or upload folder>/<id>.<ext>` (the key never carries the student's file name),
  served by a private route. The server checks each file on its own: bad files stay out with their
  reason (`notice` in the JSON, `aviso_envio` in the URL without JavaScript) and the message goes
  with the good ones. A bucket failure is logged by error name and shown as a plain Portuguese
  sentence; the provider's message never reaches the screen (`attachmentErrorMessage`).
- Staff visits ("Entrar como aluna"):
  - **Who:** `support.impersonate` (administrators). Refused for any team role (even mixed with
    others, `user,support_agent`), the staff member's own account, blocked accounts and students
    who have not created their password (`visitRefusalReason`). The button stays disabled and
    says why.
  - **Plugin:** enter and exit go through Server Actions (`support-desk/server/visit-actions.ts`)
    calling `auth.api.impersonateUser` / `stopImpersonating`; `nextCookies` writes the cookie.
    Every `/admin/*` HTTP route of the Better Auth admin plugin is in `disabledPaths`. Support
    roles are defined with no plugin powers (`features/auth/auth-roles.ts`) and listed in
    `adminRoles`, so the plugin itself refuses them as targets.
  - **Time:** 1 hour from the session's `createdAt`, checked in `getSessionState` (status
    `visit_over`, page `/visita-encerrada`). The plugin session lives 5 minutes longer so
    "Voltar ao painel" can still restore the staff session.
  - **Rules** (`support/visit-rules.ts`), applied by `runAsStudent(actionName, run)` on every
    student Server Action and by `visitForRoute` on the student write routes:
    - blocked (password, first password, sessions, name, photo, Shopee link, Shopee
      publications and store changes, logo and assistant advice, ticket decisions, opening or
      writing tickets as the student): refused, logged as `refused`, sent to `/visita-bloqueada`;
    - quiet (read markers, presence, lesson position, FAQ feedback, WhatsApp clicks): not written;
    - read-only: run, not logged;
    - `signOut`: ends the visit instead;
    - everything else runs and is logged with the staff member's id after it succeeds (a
      `redirect()` counts, with its path and no query). A failed log write is logged, never undone.
  - **Audit:** `support_impersonation_log` keeps `started` (session hook), each `action` or
    `refused`, and `ended`, grouped by `session_id`, with the ticket that motivated the visit.
    Only ids, action names and paths.
  - **One visit at a time per staff member:** entering takes a Postgres advisory lock per staff
    member (own connection, outside the pool) and ends any visit still open (double click, tab
    closed without "Voltar ao painel"), logged as `ended` / `nova visita`. A unique index keeps
    one `ended` row per visit.
  - **Stress test:** `VISIT_STRESS=1 bun run test:integration -t estresse` (off by default):
    parallel visits, 500 simultaneous actions, 50 enter/exit cycles, double clicks, presence
    flood, the 1-hour boundary, staff targets and the closed plugin routes.
  - **Guard tests:** `visit-guard.test.ts` fails when an exported student Server Action does not
    start with `return runAsStudent('<name>', ...)`, when a student write route skips
    `visitForRoute`, or when a rule names an action that no longer exists.
- Ticket forms carry a submission id (`envio`, created by the page on the server, unique on
  `support_tickets.submission_id`). The same submission sent twice returns the ticket it already
  opened, even when both arrive at the same time.
- Team and settings changes (invite, role, block, hours, holidays, pause, deadlines, distribution,
  retention, topics, templates, FAQ answers, known issues) are recorded in `staff_audit_log` with who
  and when (`recordStaffAction`, codes in `support-admin/staff-audit.ts`). `detail` never carries
  emails or written text. A deleted account keeps its rows with no person.
- `/api/health/storage` answers 503 when the bucket does not respond with the configured
  credentials (logged with the HTTP status). It is apart from `/api/health` on purpose: that one
  decides restarts, and restarting does not fix a bucket credential. Point the external monitor at
  it.

## Tests

Unit tests sit next to each pure file. `tests/integration/support-tickets.test.ts` covers, against a
real database: a reply sent closing the ticket stays new to the student, reading clears it, events
written in the same instant keep their order, an internal note does not postpone auto-close, and a
deleted staff account leaves its events anonymous and not automatic. It also covers the same
submission sent twice at once, one bad attachment among good ones, a bucket failure turning into a
Portuguese sentence, and staff actions surviving a deleted account without a name.

## Known limits

- The project's Playwright global setup writes to the real S3 bucket, so `e2e/support-tickets.spec.ts`
  only runs where the bucket credentials are valid.
- There is no account deletion flow in the platform yet; when one exists, it must remove the
  ticket attachments (tickets keep `requester_id` as `set null`).
- Page views during a staff visit are not logged, only refused writes.
- `staff_audit_log` has no screen yet; the Auditoria page in the mockup reads from it.
- No followers or "colleagues": each student has her own account and there is no organization, so
  the requester and the `emailReplies` toggle cover who gets reply emails.
- Linked items are the context fields on the ticket (lesson, store phase, error, page). There are no
  `item_linked` events yet; they come with the screen that lets someone link an item.
- No in-app bell: the student sees counters in the account menu and "Nova resposta" in the list.
