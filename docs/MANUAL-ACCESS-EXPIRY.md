# Administrative access deadlines

New manual grants require a term for each product. Choose the original evidenced purchase date
(one calendar year, February 29 clamps to February 28) or an explicit final access date. Date-only
entries include the whole final day in America/Sao_Paulo. Existing Hotmart timestamps keep their
exact original time. Account creation, first login and migration never establish a purchase date.

The deadline is checked on every protected membership read, including stale membership cache rows,
Hotmart reconciliation, protected downloads and expert access. A longer independently valid purchase
continues to authorize access. Shortening a manual term does not revoke other paid purchases; the
existing remove-product action revokes that product's entitlements. Reviewing an existing grant can also record an expired date: it immediately ceases to authorize
access without revoking another valid purchase. New account invitations require a current term.
Each administrative change
records the selected deadline and reason. An identical deadline is a no-op.

## Existing undated grants

Migration `0075_manual-access-expiry` adds nullable deadline columns without guessing dates or
cutting off unverified accounts. Only pre-existing undated grants retain their prior behavior.
The administrator's access page lists all undated grants with pagination and links to accounts.
Account details show the manual deadline separately from the effective product deadline.

After migration, preview the evidence-based reconciliation:

```bash
bun --env-file=.env.local scripts/reconcile-manual-access.ts
bun --env-file=.env.local scripts/reconcile-manual-access.ts --apply
```

Production builds ship `build/runtime/reconcile-manual-access.mjs` for execution with Node and
the target environment's DATABASE_URL. The command emits aggregate counts only. Preview writes
nothing. Apply runs atomically under the shared entitlement mapping lock (exclusively acquired),
sets only previously undated grants to the latest proven deadline for that account and product,
and inserts audit events. It preserves exact purchase timestamps, expired deadlines, refunds,
administrative exclusions, separate products and already dated manual grants. It does not create
accounts, credentials, email or new grants. Repeating it cannot extend a dated term.

Unmatched grants stay in the review list. Verify the original receipt and set the term on the
account. Never assume the account date is the purchase date. Store-only legacy references do not
prove a paid term, so the legacy store importer now imports records without granting access.

Deployment and application of this command are separate operational actions. Inspect preview counts
before applying. The migration alone does not reconcile existing grants.

## Verification in the development checkout

The new migration and reconciliation command passed against clean isolated PostgreSQL databases.
The development database had matching SQL hashes recorded under pre-integration journal timestamps.
After a private full backup and a migration-history snapshot, the local repair preserved every
hash, aligned four existing timestamps to the repository journal, and applied seven missing
migrations transactionally. A subsequent standard `bun run db:migrate` completed without replay.
The local evidence preview found no undated grants. This does not establish production state.

All 804 unit tests passed with `bun test --isolate src`; the regular combined run intermittently
failed the unrelated bundled-font rendering assertion, which also passed on its own. The 164
integration tests passed (nine pre-existing stress cases skipped). Browser checks covered account
creation, term changes, administrator restrictions, both themes, mobile/desktop, accessibility and
submission without JavaScript.
