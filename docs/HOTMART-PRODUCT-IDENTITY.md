# Hotmart product identity

Authenticated version 2 webhooks can identify a configured product by its numeric
`data.product.id` as well as its existing `data.product.ucode`. The ucode remains
required and remains the key used by access reconciliation and refunds.

Migration `0065_hotmart-numeric-product-identities` configures these products:

| Hotmart ID | Access                         | Expert    |
| ---------- | ------------------------------ | --------- |
| 8781486    | Loja Pronta (`loja-pronta`)    | Zé (`ze`) |
| 8781449    | Loja que Vende Sozinha (`sll`) | Zé (`ze`) |

On the first authenticated delivery, a numeric mapping binds to the supplied
ucode and creates a secondary ucode mapping. Existing primary mappings are
preserved. Conflicting IDs, ucodes, access types or experts do not grant or
revoke access; the event is recorded and receives HTTP 503 for later retry after
correction. Account creation happens only after identity validation.

New purchase and event records retain the numeric ID when supplied. Older
records remain nullable: their numeric IDs cannot be reconstructed from the
previous event history. Previously unconfigured events can be retried using the
same event ID after deployment; the original purchase date is still required,
and retrying does not extend the access term. Ask Hotmart to resend the original
notifications; do not invent missing product IDs or purchase dates.

The existing verification token remains encrypted in the database. This change
does not rotate it or store credentials in source files. Deployment must apply
the migration before starting the updated webhook handler, as handled by the
existing production startup script.

## Pending purchase recovery

Migration `0071_hotmart-pending-event-recovery` retains the original event version,
event date, order date, buyer name and product name alongside the existing event identifiers.
Only validated fields are stored; payment details, documents and the raw checkout payload
remain excluded. Product names are descriptive and never determine entitlements.
The metadata follows the [official purchase webhook schema](https://developers.hotmart.com/docs/en/2.0.0/webhook/purchase-webhook/).

Unresolved events appear above the Hotmart settings and in an overview warning, including
events older than the recent-history window. Administrators can search by email, numeric
product ID, product name, ucode or transaction. The product-configuration link prefills the
observed ucode and requires an explicit access and expert choice. Configuring an offer or
saving the primary product settings automatically attempts recovery of up to 50 eligible
events per product. The administration recovery button processes another bounded batch.
Each replay uses the normal account, identity, expiry, access and idempotency checks.
Refunds run before approvals, and a retained unresolved refund blocks a live or replayed
approval of the same transaction. Existing credentials and manual access exclusions survive.

Legacy events with missing original metadata, and approvals without an original order date,
require Hotmart to resend the original notification. Neither migration nor recovery invents
dates, creates a synthetic approval or assigns an unknown product to a default course.
The affected customer's access remains pending until the sold products are identified and
configured and complete original notifications are available.

Verification: `bun run typecheck`, `bun run lint`, `bun test src`,
`bun --env-file=.env.local scripts/run-tests-with-database.ts integration`, and
`bun --env-file=.env.local scripts/run-tests-with-database.ts e2e --config=playwright.hotmart.config.ts`.
