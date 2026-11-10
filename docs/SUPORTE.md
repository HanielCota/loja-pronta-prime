# Support

Support happens on WhatsApp, with one contact per topic. The in-platform ticket system (spec in
`docs/PROMPT-SUPORTE-CHAMADOS.md`) was retired: its URLs only redirect, and its code was removed on
2026-11-10. The ticket tables stay in the database for history and retention.

## Where things live

| What                                         | Where                                                                                                                       |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| WhatsApp contacts and topics (tested)        | `src/features/support/`: `contacts.ts`, `whatsapp.ts`, `catalog.ts`                                                         |
| Settings (WhatsApp numbers, retention)       | `src/features/support/server/settings.ts`, `server/contacts.ts`, `server/actions.ts`, screen `/admin/suporte/configuracoes` |
| Retention of old tickets                     | `src/features/support/server/maintenance.ts`, called from `scripts/run-assistant-worker.ts`                                 |
| Staff roles and visits ("Entrar como aluna") | `src/features/staff/`                                                                                                       |
| Data                                         | `src/server/db/schema/support-tickets.ts` (historical), `drizzle/0066_support-tickets.sql`                                  |

## Screens

- Profile (`/perfil#suporte`) and `/suporte/acesso` (public, linked from the login page): WhatsApp
  help by topic.
- `/suporte/whatsapp/<topic>`: counts the click (no content) and redirects to `wa.me`.
- `/admin/suporte/configuracoes`: WhatsApp contacts and data retention.
- Retired and redirecting: `/suporte`, `/suporte/novo`, `/suporte/<number>`,
  `/suporte/acesso/<token>`, `/admin/chamados`, `/admin/suporte`, `/admin/suporte/equipe`,
  `/admin/suporte/desempenho`. The ticket API routes answer 410.

## Roles

`user.role` keeps comma-separated roles: `support_agent`, `support_supervisor` and `admin`. The
matrix is in `src/features/staff/staff-access.ts`; pages and actions check it on the server
(`requireStaff`, `readStaffSession`). Create local staff with
`bun run dev:equipe <email> <senha> --cargo=atendente|supervisor|admin`.

## Staff visits ("Entrar como aluna")

- **Who:** `support.impersonate` (administrators). Refused for any team role, the staff member's
  own account, blocked accounts and students who have not created their password
  (`visitRefusalReason`). The button stays disabled and says why.
- **Plugin:** enter and exit go through Server Actions (`staff/server/visit-actions.ts`) calling
  `auth.api.impersonateUser` / `stopImpersonating`; `nextCookies` writes the cookie. Every
  `/admin/*` HTTP route of the Better Auth admin plugin is in `disabledPaths`.
- **Time:** 1 hour from the session's `createdAt`, checked in `getSessionState` (status
  `visit_over`, page `/visita-encerrada`). The plugin session lives 5 minutes longer so "Voltar ao
  painel" can still restore the staff session.
- **Rules** (`staff/visit-rules.ts`), applied by `runAsStudent(actionName, run)` on every student
  Server Action and by `visitForRoute` on the student write routes: blocked actions are refused and
  logged; quiet ones (read markers, presence, lesson position, WhatsApp clicks) are not written;
  read-only ones run without a log; `signOut` ends the visit; everything else runs and is logged
  with the staff member's id.
- **Audit:** `support_impersonation_log` keeps `started`, each `action` or `refused`, and `ended`,
  grouped by `session_id`. Only ids, action names and paths.
- **One visit at a time per staff member:** a Postgres advisory lock per staff member, and any
  visit still open is ended on the next entry.
- **Guard tests:** `staff/visit-guard.test.ts` fails when an exported student Server Action does
  not start with `return runAsStudent('<name>', ...)`, when a student write route skips
  `visitForRoute`, or when a rule names an action that no longer exists.
- **Stress test:** `VISIT_STRESS=1 bun run test:integration -t estresse` (off by default).

## Other notes

- `/api/health/storage` answers 503 when the bucket does not respond with the configured
  credentials. It is apart from `/api/health` on purpose: that one decides restarts, and
  restarting does not fix a bucket credential.
- Page views during a staff visit are not logged, only refused writes.
