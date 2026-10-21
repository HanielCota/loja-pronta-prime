# Legacy Loja Pronta data migration

The previous `loja-pronta-entrega` project contains delivery records, not the authentication or progress model used by this application. The migration preserves its four tables as local historical records and links customers to accounts by trimmed, lowercase email. The application never needs a Supabase key to read imported data.

## Source inventory

The October 21, 2026 export contains 9,858 customers, 5,014 stores, 52,964 products and 8,827 Hotmart transaction references. All customer emails are valid and unique after normalization. Every customer has a store or transaction reference. All store, product and transaction relationships resolve. Eighty-three customers have multiple stores; all stores are preserved. Fifty-six stores reference another store belonging to the same customer; that relationship is preserved and checked again when displaying products.

The source has no authentication users and no storage buckets or objects. It does not contain logos, current API authorizations, purchase approval/refund status or course progress. Historical delivery and listing states are never treated as live Shopee confirmations. No new Shopee connection is created by the import.

## Account and access rules

- Existing account IDs, passwords, roles, email verification, blocks, current store setup and course progress remain unchanged.
- New accounts use the existing initial-password policy, with separate salted hashes and no mandatory first-access change.
- Only legacy customers with a store or transaction reference qualify for Loja Pronta membership. SLL access is never inferred.
- Blocked accounts, administrative/custom roles, and accounts with recorded revocations or refunds are excluded from access grants.
- Added access is recorded as a manual legacy membership grant, with the snapshot fingerprint in the access history. Transaction references are historical evidence, not newly approved Hotmart purchases. As with other manual grants, a later Hotmart refund does not automatically remove that manual membership; support must review and remove it when appropriate.
- Each snapshot is imported once. Replaying it verifies the records and does not restore revoked access or replace passwords. A different snapshot from the same source requires explicit reconciliation.

## Private export files

Keep exports and credentials outside the repository. The importer reads `customers.json`, `stores.json`, `products.json`, `purchases.json` and `manifest.json` from a private directory. The manifest identifies source project `voslzzgajgatdcrueikw`, export time, row counts and SHA-256 for each source file. Original fields and values are retained in JSONB alongside indexed relationships.

Never commit source records, passwords, API keys or database backups. Remove temporary export credentials after the final source reconciliation.

## Rehearsal and execution

Apply the generated Drizzle migration before running the importer. Take a destination backup first and retain a complete source export.

```bash
# Read-only preview against the intended database.
bun --env-file=.env.local scripts/import-legacy-stores.ts --input=/private/snapshot

# Atomic import after reviewing the preview.
bun --env-file=.env.local scripts/import-legacy-stores.ts --input=/private/snapshot --apply
```

The production runtime includes the same command:

```bash
node /app/build/runtime/import-legacy-stores.mjs --input=/private/snapshot
node /app/build/runtime/import-legacy-stores.mjs --input=/private/snapshot --apply
```

All source checks happen before writes. New credential hashes are prepared before the write transaction. The transaction creates missing accounts, stores the original records, applies eligible grants, verifies every imported JSONB record and account relationship, and writes the import receipt. Any failure rolls back the entire import. Logs contain counts and error types, not source records or credentials.

## Verification and cutover

Reconcile every source table's IDs, counts and original records against the destination. Re-run the importer in preview mode to verify the saved snapshot. Check representative accounts with no store, multiple stores, linked products, partial delivery and recorded delivery. Check administrator access to blocked accounts, student ownership enforcement, desktop/mobile layouts and both themes.

Members review their records in Loja Pronta under **Previous stores**. When a member has previous stores and has not started a new setup, that history is their initial Loja Pronta view. Existing current setup is preserved. Administrators find the same records in **View current stage** on the account page, including accounts without current membership. The same page shows original customer contact details and transaction references, including customers who have no saved store.

Before stopping the old system, reconcile changes made after the export and route any remaining purchase notifications to the current webhook. Retain the old project as a backup until this reconciliation and representative access checks pass. Pausing or deleting the source is separate from the data import; a successful import alone does not establish that every external client has stopped using it.
