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
