# Legacy catalog recovery

The recovery preserves the immutable historical tables and adds a shared product catalog,
customer-specific recovery mappings, and a receipt for each applied run. It does not enqueue
publication jobs, change customer access, advance store setup, or change Shopee settings.

The completed operational recovery read the verified private account/store/product archives
and collected Shopee catalogs. Original image bytes must be archived with their SHA-256
checksums. Identical image content is checked once per run.

The source environment is the live application `2035747`, with publication disabled.
Preview and apply produce the same deterministic run ID and export checksums for the same
engine, inputs, media, and account-protection state. Preparation and external storage happen
outside write transactions. Database writes use small, resumable batches and verify each
original product record and its current customer/store association. An incomplete run remains
unapplied; readers use only the latest applied receipt.

## Identity and variations

An original shop/item reference is direct evidence. Shared matching requires both a recognized
base title and an identical normalized product description. The normalizer removes only the
20 introductory and 20 closing templates observed in the source export, with their repeated
store-name paragraph. Original customer titles, descriptions, and prices remain intact.

Variation validation checks axes, unique options, supplier SKUs, model identifiers, coordinates,
and duplicate combinations. Sparse matrices retain only observed combinations. Conflicting
product or variation versions remain in review. Missing image archives block recovery. Source
Shopee item and model identifiers remain provenance; reconstructed products receive deterministic new SKUs.

Recovered data does not establish current supplier stock, cost, or marketplace eligibility.
Every reconstructed product records `publicationReady: false` and the required offer and
destination-preparation checks. Historical source prices are not copied into another customer's
variant prices. Placeholder shipping measurements remain explicitly flagged for review.

## Stored results and reads

- `legacy_catalog_recovery_runs`: manifest checksum, counts, and application receipt.
- `legacy_catalog_products`: validated source product data and provenance for each run.
- `legacy_product_recoveries`: original product/store/customer association, source fingerprint,
  recovery method, status, and reasons.
- Private exports: `catalog.json`, `products.ndjson.gz`, `stores.json`, and `manifest.json` under
  the content-derived run prefix. Independent verification is stored beside the manifest.

`readRecoveredLegacyCatalog(client, authenticatedUserId, legacyStoreId)` returns customer-scoped
reconstructed data for import preparation. It verifies current ownership, linked-store ownership,
the applied receipt, and original record fingerprints. Source references and another customer's
observed prices are excluded from reconstructed product data. The caller authenticates the viewer
and checks their current product access before invoking this server-only reader.

The existing historical pages and publication availability are unchanged. The recovered data
layer and reader are available for the import workflow; this recovery does not enable publication.

## Verification and schema bootstrap

```sh
bun test src/features/legacy-stores/recovery.test.ts
bun run test:integration --test-name-pattern 'imports only audited own products'
```

The database verification uses temporary tables and rolls back every fixture. It covers batch
repetition, cross-account rejection, source edits, unapplied receipts, scoped reads, and account
deletion. Removing an account removes its recovery mappings and does not block normal deletion.

Migration `0066` supports an earlier verified operational bootstrap: it creates all three tables
when absent, rejects an incomplete bootstrap, and is a no-op when all three exist. Migration
`0067` preserves account deletion through the new ownership foreign key. An operational bootstrap
executes only these migrations and does not advance the migration journal, so unrelated pending
migrations remain available to the normal deployment process.

Additional source shops are selected by their potential coverage of missing title groups.
That estimate is not a recovery guarantee: every new source goes through the same description,
variation, media, ownership, and receipt verification before another batch is applied.

## Customer import and review

Customer import is pinned to audited run
`0fc6449d98bb5f560e330ad882c5af8d6217b071d8d51831668303e5cb4e6027`.
An unapplied or subsequently collected run cannot silently enter this release. Current
membership, current customer ownership, original source fingerprints and recovered status are
checked server-side. Private image responses recheck access and content checksums and use
`private, no-store`. Source Shopee credentials and other customers' observed prices are never
sent to a client.

`legacy_catalog_imports` stores customer-owned review drafts. Import locks the original rows
and ownership association, inserts at most 50 selected products atomically, and deduplicates by
customer and original product. A repeated import never overwrites a review. Editing uses an
optimistic revision and preserves recovery provenance, photos, variations, shipping warnings
and publication blockers. Account deletion removes these drafts. Source edits, ownership
changes, protected statuses and missing entitlements prevent subsequent access.

Routes:

- `/loja-pronta/produtos/recovered`: private review list and available previous stores.
- `/loja-pronta/previous-stores/<id>/import`: selection and import into that list.
- `/loja-pronta/produtos/recovered/<id>`: title, description and price review.

There is no collection worker, access recovery, new Shopee authorization or marketplace write
in this flow. Supplier cost, stock, shipping and destination preparation must be checked by a
later publication workflow. The two additional collected source catalogs remain unapplied.
