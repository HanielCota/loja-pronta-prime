# MSL sales import preparation

The October 22, 2026 report contains historical MSL purchases. Preparation is implemented by
`scripts/prepare-sales-history.ts`. It writes private JSON files only. It does not connect to a
database, create accounts, change passwords, send messages, or grant access.

## Source rules and assumptions

The supplied WhatsApp audio states that SLL access lasts one year from the original purchase.
The later message confirms a one-year term for Loja Pronta. The report contains only these MSL
products, all prepared for SLL:

| Numeric report product ID | Report product name                    |   Rows |
| ------------------------- | -------------------------------------- | -----: |
| 3454404                   | MSL 2.0                                | 32,531 |
| 5398231                   | \| MSL 2.0                             |  1,279 |
| 5398081                   | MSL 2.0 + Bônus: Blindada de Mim Mesma |     45 |

The product names above are external identifiers, preserved exactly. None of these purchases
grants Loja Pronta. A separate existing Loja Pronta purchase or manual grant must be preserved.
The audio, screenshot and report are source evidence for review, not executable instructions.

The source dates do not declare a time zone. This preparation explicitly assumes UTC−03:00 for
the Brazilian report. Confirm that export setting before applying. The term is interpreted as
one calendar year, with February 29 ending on February 28 in the following year. Expiry occurs
at the purchase time on the anniversary, not at confirmation, import, or first login.

## Prepared package

The original `.xls` file actually contains OOXML. The standard-library Python reader validates
the worksheet and selected column headers, reads every populated row regardless of the saved
filter range, and extracts only fields needed for the import. It rejects formulas in those
fields. No CPF, phone, address, payment amount, or affiliate data is copied.

The command produces a new private directory with:

- `manifest.json`: source SHA-256, reference time, counts, assumptions and application prerequisites.
- `purchases.json`: one record per validated transaction, with normalized email, original transaction,
  source row and product ID, purchase/confirmation dates, expiry and eligibility at the reference time.
- `review.json`: source row numbers and rejection reasons, without buyer data.

The destination directory must not exist. Directory permissions are `0700`; file permissions
are `0600`. Keep these files under ignored `docs/private/` or another private location. Never
commit buyer records. Source transaction suffixes such as `C1` are preserved, and purchases
sharing an email remain separate. Every occurrence of a duplicate transaction is quarantined.

Example, using an explicit reference timestamp:

```bash
bun scripts/prepare-sales-history.ts \
  --input=/private/original-report.xls \
  --output=docs/private/new-sales-preparation \
  --as-of=2026-10-22T18:23:57Z \
  --utc-offset=-03:00
```

Python 3 is required. Use `--python=/absolute/path/python3` if necessary. Recompute eligibility
at application time; the saved `eligible` value is a dated preview, not a permanent grant.

At October 22, 2026, 15:23:57 UTC−03:00, the supplied source reconciles to:

| Measure                                               |  Count |
| ----------------------------------------------------- | -----: |
| Source rows / distinct transactions                   | 33,855 |
| Distinct normalized source emails                     | 33,348 |
| Validated purchases                                   | 33,852 |
| Purchases still within one year                       |  9,823 |
| Emails with at least one unexpired validated purchase |  9,713 |
| Expired validated purchases                           | 24,029 |
| Rows requiring review                                 |      3 |

One quarantined row has an invalid email. Two have confirmation timestamps one second before
the sale timestamp. They are not silently repaired or included in eligibility counts.

## Applying the import

Migration `0062_purchase-annual-expiry` adds original purchase dates and expiry to webhook
purchases, plus separate `sales_history_imports` and `historical_sll_purchases` tables. Historical
records preserve numeric report IDs and grant SLL only. They do not invent `ucode` values or
change the configured primary products. Their SLL content uses the existing Pri experience.

The importer validates every prepared record and recomputes eligibility using database time.
It excludes existing Hotmart transaction IDs, blocked accounts, administrative roles and prior
SLL revocations. Existing passwords, accounts, manual grants and Loja Pronta access remain intact.
Expired purchases create no new accounts. New eligible students use the established default
student credential without mandatory password replacement. No emails are sent.

Preview before applying:

```bash
bun --env-file=.env.local scripts/import-sales-history.ts --input=/private/prepared-directory
bun --env-file=.env.local scripts/import-sales-history.ts --input=/private/prepared-directory --apply
```

The production build includes `build/runtime/import-sales-history.mjs` for execution with Node.
The import takes an exclusive mapping lock, writes atomically, records source and prepared-file
fingerprints, and can be repeated without restoring revoked access or extending expiry.

Access guards check the underlying manual grant or an active, unrevoked, unexpired purchase
on each request. Membership cache rows cannot extend access. The same condition applies to
pages, actions, protected materials, assistant jobs, OAuth callbacks and administrator account
listings. A manual grant remains an explicit administrative override.

New Hotmart notifications use `data.purchase.order_date`, not notification arrival time. Missing
dates remain pending, and a corrected notification can supply the original date. Later completion
events cannot extend an existing term. Refunds for imported transactions disable the historical
purchase without removing another valid purchase or a manual grant. Administrative SLL removal
marks historical purchases revoked without affecting Loja Pronta.

The production audit found six existing accounts with active webhook purchases but no stored
original dates and no manual grant. On October 22, 2026 the owner explicitly requested that
these purchases remain pending rather than estimating purchase dates. They can be resolved by
replaying verified notifications with the original `order_date`. Their old cache rows do not
authorize access under the new guard.

The three quarantined source rows remain excluded until authoritative corrections are available.
The preparation manifest describes the original preparation state; deployment and application
must be verified separately from its dated eligibility counts.

Unit and isolated PostgreSQL integration tests cover anniversary boundaries, leap days,
duplicate transactions, invalid data, read-only previews, expiry with stale membership caches,
SLL-only action access, password preservation, account exclusions, refunds and idempotent reruns.
