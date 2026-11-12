# Changelog

Dates use the America/Sao_Paulo time zone. Operational verification and rollout limits are
recorded separately from code integration.

## 2026-11-12

### Recovered Shopee connection and publication

- Embed a unique deployment ID in each Next.js production build. A stalled in-app navigation
  restores the previous page and offers a direct link to reload the destination.
- Allow the recovered catalog's native authorization form to follow its redirect to Shopee.
- Read independent marketplace metadata concurrently and cancel the interactive lookup after
  25 seconds. Show progress and retry messages, and log only the failed stage, reason, and timing.
- Serialize recovered listing writes with disconnect and check the exact connection authorization
  before sending each write. A listing with an uncertain result still requires reconciliation.

### Student account recovery

- Let administrators generate an individual temporary password for active student accounts with
  verified email addresses. Issuing it revokes previous credentials, sessions, and reset links.
  The student must create a new password before entering the member area.

### Hotmart first access

- Queue one password-creation email when an approved Hotmart purchase creates a new student account
  and grants access. The existing worker delivers it through Resend with bounded retries.
- Migration `0081_hotmart-first-access-email` adds the pending email table. No earlier purchases are
  backfilled. The rollout requires the existing authentication email configuration and worker.

## 2026-11-11

### Shopee connection lifecycle

- Connection status reads local state. Token refresh remains part of operations that use the API.
- Assistant publication and listing-change requests recheck the exact authorization under the
  same lock used for disconnection. A partially created listing requires reconciliation.
- Recovered products provide a disconnect action before setup is complete. Superseded authorization
  attempts retain their return destination while refusing another token exchange.
- Migration `0080_shopee-connection-scope` preserves existing tokens and keys connections by
  account and application. Each application ID includes the environment. A new authorization ID
  distinguishes reconnecting from refreshing tokens within the same connection.

## 2026-11-10

### Assisted delivery member access

- Replace the `SHOPEE_ASSISTED_SUBACCOUNT` instruction with Shopee's official sub-account flow
  (main account, shop authorization, member with the Merchandiser role). The customer submits
  the member login ID and password with the first approval; review-only resubmissions do not
  ask again.
- Store the password in `assisted_deliveries.member_password` with AES-256-GCM, a key derived
  from `BETTER_AUTH_SECRET` (HKDF info `assisted-delivery-member-v1`) and the user and shop as
  associated data. Migration `0079_assisted-delivery-member-access` adds the two columns.
- `/admin/entregas/[id]` shows the access while the delivery is open and unclaimed or claimed by
  the viewer; completion clears the password and keeps the login ID for the record.
- `SHOPEE_ASSISTED_SUBACCOUNT` is no longer read and can be removed from the runtime.

### Performance and cleanup

- Cache versioned private images (SLL banners, course covers, lesson images) in the browser with
  `private, max-age=31536000, immutable` when the `?v=` storage version matches; a stale or missing
  version keeps the previous short or no-store answer. The profile photo is cached for one day
  only, since it can stay on a shared device after sign-out.
- Add indexes for `store_automation_jobs (user_id, kind, created_at)`,
  `assistant_publication_items (batch_id)` and `assistant_category_experiments (user_id,
  created_at)` in migration `0078_performance-indexes`.
- Read store observations once per request and skip the write-only `traffic_report` column.
- Skip presence upserts for the same page within 55 seconds, comparing against the database clock,
  and widen the online window from 90 to 120 seconds so two lost heartbeats are still tolerated.
- Prune sessions and verifications expired for over a week from the assistant worker, hourly.
- Remove the retired ticket system code (about 7,600 lines): pages, actions, queries,
  notifications, desk and admin components and their tests. Redirects, the 410 API routes,
  WhatsApp help, retention and the historical tables stay. Staff roles and student visits move to
  `src/features/staff/`. `src/server/email/send.ts` is removed; account emails keep using
  `src/server/auth/emails.ts`.

## 2026-11-09

### Credential security and assisted delivery recovery

- Retire the shared student credential across Hotmart, historical imports and administrative
  password recovery. New buyers create their first password through email recovery. The production
  migrator selectively revokes existing matching credentials, sessions and reset links.
- Revoke credentials, sessions and old reset links when promoting an account to administrator.
  Require a new password via email. Reject sign-ins overlapping the credential change.
- Let administrators reassign an assisted delivery or obtain renewed approval for unconfirmed
  products after reconciling Shopee. Preserve the approved brand and confirmed listing IDs.
- Upgrade Zod to 4.6.6 for GHSA-mrhx-c7xc-m3w5 and verify the runtime supervisor test on Windows.
- Apply migration `0077_credential-security-and-delivery-review` during a coordinated rollout.
  Production rollout and Seller Centre acceptance are pending.

### Logo generation and banner exports

- Use GPT Image 2.6 Flare for square PNG logos. Confirm access in the production OpenAI project
  before rollout.
- Mark generation as coming soon without an OpenAI key and preserve the student's quota.
- Wrap banner text by rendered glyph width and keep it inside both PNG layouts.
- Run the isolated logo failure and request contract tests in CI.

## 2026-11-08

### Assisted delivery pilot access

- Require a designated Escala Shop account and Brazilian Shopee shop for new assisted requests.
  Validate the account and shop on submission and prefill the configured public shop URL.
  Live rollout and Seller Centre acceptance are pending.

## 2026-11-07

### Assisted Loja Pronta delivery

- Keep brand customization and approval with the customer. Let support claim the delivery,
  download the approved logo and bulk-add workbook, and record active Shopee listing IDs.
- Refresh the selected supplier catalog independently of a Shopee connection. Resume partial
  deliveries with a workbook containing only the unconfirmed products.
- Add migration `0076_assisted-store-deliveries`. Intake is disabled by default pending an
  official workbook and a live-store pilot.

## 2026-11-03

### Support responsibilities

- Assign lessons, ombudsman, refunds, and Reclame Aqui to Dani. Assign access, errors, and
  Envio Velox to Mylena. Add subject links for refunds and Reclame Aqui that open Dani's WhatsApp.
- Preserve existing support URLs and use the configured numbers without a database migration.

### Support contact reassignment

- Route lesson questions to Mylena's existing technical contact and Envio Velox questions to
  Dani's existing ombudsman contact, preserving the four student-facing subjects and legacy URLs.
- Configure one WhatsApp number per current contact. Ignore retired lessons/shipping phone rows
  on reads and submissions; missing current numbers retain the coming-soon state.
- No schema migration or production contact change is required. Production rollout is unverified.

### Next.js security update

- Upgrade Next.js to 16.4.1 to address GHSA-673q-mjm6-r5xr, GHSA-2464-fhr4-w9xw, and
  GHSA-p3m5-59mp-jv5r. The fixes take effect when the new application build is deployed.

## 2026-10-29

### Dated administrative access

- Require a purchase anniversary or an explicit final Brasília calendar date for every new
  administrative grant, including each product selected during account creation.
- Audit the stored deadline, allow corrections to existing manual terms, and enforce expiry
  in membership reads, Hotmart reconciliation, expert selection and profile validity.
- Add migration `0075_manual-access-expiry` and an admin-only paginated review of old undated
  grants. Preserve unknown legacy terms until verified; do not infer purchase dates.
- Ship `reconcile-manual-access.mjs`: preview by default, explicit application updates only
  undated grants backed by dated, active, non-revoked purchases and records an audit event.
  Expired evidence restores the original expired deadline; reruns never renew dated access.
- Stop the legacy store importer from creating undated entitlements from store references.
  Production migration, reconciliation and rollout must be performed separately.

### Purchase ownership and Shopee reconciliation

- Preserve an existing Hotmart purchase owner across platform email changes and reuse of the old
  email address. Later purchase events no longer create or grant access to another account.
- Require a remote `NORMAL` status when reconciling simple listings as well as variations, before
  confirming publication, advancing store setup or starting the observation period.
- Scope unresolved brand-publication guards to the current shop and application in both direct
  queueing and automatic scanning. Preserve uncertain results for previous destinations without
  retrying their writes; the current destination still prevents duplicate unresolved sends.
- Cover email reuse, refunds, live/unlisted/banned reconciliation and destination changes with
  isolated database regression tests. Production rollout and real Shopee writes remain unverified.

## 2026-10-28

### Privacy contact on WhatsApp

- Replace both privacy-policy email links with the configured technical WhatsApp contact and
  a privacy-request message. Update the policy revision date and remove unused email constants.
- Preserve public access and existing privacy rights/response periods. Missing or unavailable
  contact configuration shows a coming-soon state without an email fallback.

### WhatsApp-only profile support

- Remove the profile support email row and email-change fallback. Expiring-access help uses the
  configured technical WhatsApp contact instead of a separate hardcoded number and email fallback.
- Preserve the privacy-policy link and coming-soon states for unconfigured WhatsApp contacts.

### Consolidate support on WhatsApp

- Retire member and public ticket forms, conversations, staff queues, reports and team screens.
  Old page links lead to WhatsApp help; ticket APIs return HTTP 410 and stale actions cannot write.
- Keep subject-specific WhatsApp contacts and administrator contact settings. Remove ticket
  counters, dashboard queries and ticket links from the profile, courses and store journey.
- Stop deadline and auto-close jobs; retain the established historical retention policy.
  No database migration or immediate record deletion is included. Production rollout is unverified.

### CPU and memory resource fixes

- Index support resolutions by ticket and repeat subject, preserving stable timestamp ties,
  rating windows and seven-day returns. Reuse calculated facts within each report render.
- Cache banner PNGs by account, brand fingerprint, revision and variant for five minutes.
  Cap cached output at 8 MiB/64 entries and generation at two active jobs/16 pending keys.
  Every request still checks ownership, current revision and download approval before reuse.
- Skip saturated in-memory rate-limit scans until an existing entry can expire. Weakly held
  expiry metadata does not retain otherwise unused limiter maps.
- Release decoded bitmaps and canvas backing storage on success and all failure paths.
- Local synthetic Node measurements reduced the 10,000-ticket resolution calculation from
  about 2,628 ms to 10 ms and 20,000 saturated limiter checks from about 659 ms to 3 ms.
  These are development-machine measurements, not production latency or capacity guarantees.

### Review fixes and course performance

- Reuse the current transaction for support settings and holiday reads, avoiding nested pool
  acquisition while holding ticket locks.
- Serialize the open-ticket limit and insertion per account, preserving submission idempotency.
- Separate committed support tickets and attachments from public-link delivery failures; retries
  resend the access link without creating another ticket or removing committed files.
- Require matching, present variation stock before activating or reconciling Shopee listings.
- Cache the published Zé Mauro navigation and video availability with the shared content tag;
  load full blocks only for the selected lesson. Access and progress remain private and uncached.
- Refresh private completion state without invalidating shared published course content.
- Always release supplier lock connections and discard connections whose unlock failed.
- Production rollout and real Shopee publication remain unverified by these local changes.

## 2026-10-26

### Escala Shop identity and member access

- Adopted **Escala Shop** as the platform name and
  **https://membros.escalashop.com.br** as the canonical member address.
- Preserved existing accounts, purchases, student progress, storage and the established design.
- Redirected old browser links while preserving their paths and query parameters. Existing
  Hotmart webhook endpoints and Shopee/Bling callback bridges remain supported.
- Preserved security headers on domain redirects and protected authentication/callback links.
- References: [#159](https://github.com/HanielCota/loja-pronta-prime/pull/159),
  [#160](https://github.com/HanielCota/loja-pronta-prime/pull/160).

### Recovered legacy product catalog

- Recovered **27,972 product records** for customer reimport, preserving the **52,964 original
  legacy product records**.
- Added private customer lists with product selection, photos, recovered variation combinations,
  and editable names, descriptions and sale prices.
- Made imports repeatable without duplicates or loss of previously saved edits. Access to
  products and archived images is checked against the current owner and audited source.
- Kept ambiguous, incomplete and protected records outside the importable recovered selection.
  Further source-shop recovery was intentionally stopped at the owner's request.
- Importing saves a draft for review; it does not publish a Shopee listing.
- Reference: [#162](https://github.com/HanielCota/loja-pronta-prime/pull/162).

### Reviewed and confirmed Shopee publication

- Added a separate connection path for recovered products without advancing new-store setup.
- Added review of the destination shop, photos, variations, current seller-entered costs and
  stock, sale prices, packaging, category requirements, barcodes and shipping options.
- Required a separate, explicit confirmation tied to the reviewed snapshot. Reviews expire
  after 15 minutes; changes to the draft, ownership or destination invalidate authorization.
- Added a durable publication queue. Listings are created hidden, their data and variations
  are checked, and activation is requested only after verification. Uncertain listing writes
  are not automatically repeated.
- Restricted this flow to Brazilian shops in normal standing, with the existing Shopee pilot
  eligibility preserved. General release and the first real seller-confirmed listing remain
  pending; no real listing was created during development or verification.
- Verified the deployed routes, healthy worker and preserved recovered catalog. Browser checks
  covered desktop/mobile layouts, both themes, required consent and edit freezing.
- References: [#166](https://github.com/HanielCota/loja-pronta-prime/pull/166),
  [#168](https://github.com/HanielCota/loja-pronta-prime/pull/168).

### Independent Zé Mauro course

- Published a separate course area at `/ze-mauro`, with **14 modules and 57 available videos**,
  lesson navigation and individual progress.
- Kept access and progress separate from Pri's course. The 16 shared videos excluded by the
  owner were not imported into Zé's catalog.
- Marked the eight entries without supplied recordings as coming soon, without playback or
  completion controls.
- Added a read-only administrator preview and a shortcut in expert administration. Previewing
  does not change purchases, grants or student progress.
- Prepared five course screenshots and a ZIP for the owner to share with the course manager.
- References: [#163](https://github.com/HanielCota/loja-pronta-prime/pull/163),
  [#164](https://github.com/HanielCota/loja-pronta-prime/pull/164).

### Banner rendering

- Bundled and registered the production fonts before rendering banner exports, fixing missing
  glyphs and square characters in text and accented letters.
- Verified font availability and rendering on the production server. Affected customers can
  reopen the banner page and download newly rendered files.
- Reference: [#165](https://github.com/HanielCota/loja-pronta-prime/pull/165).

### Hotmart purchase recovery and administration

- Integrated retention of validated original metadata for unresolved purchase events, without
  storing the raw checkout payload or payment details.
- Added administrator warnings, searchable pending events, explicit product/expert configuration
  links and bounded recovery batches for eligible events.
- Preserved identity, expiry, refund and duplicate-event checks. Unknown products do not grant
  access automatically; older events without sufficient original metadata still require a
  resend from Hotmart.
- Deployed the correction to a healthy production version and verified the pending-event panel.
  Final migration verification was still in progress when this entry was updated. Individual
  access cases requiring product identification or missing original notifications were not
  recorded as resolved.
- Reference: [#167](https://github.com/HanielCota/loja-pronta-prime/pull/167).

### Verification notes

- Feature work included type checking, linting, source/database tests and browser checks as
  applicable. Documentation-only changes do not alter application behavior.
- Recovered-publication verification included 618 source tests, a full 121-test database suite,
  and six final focused database scenarios covering publication, connection and shop eligibility.
- Deployment success is not evidence of Shopee approval or of a completed real listing. The
  existing pilot boundary remains in effect until live seller validation is completed.
