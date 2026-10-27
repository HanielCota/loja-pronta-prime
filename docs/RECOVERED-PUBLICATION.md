# Confirmed recovered product publication

Recovered imports remain private drafts. A customer with active Loja Pronta access can connect
Shopee independently of the new-store setup, review current supplier data, and explicitly confirm
one product for publication. This does not resume legacy recovery or advance the setup phase.

The flow is available at `/loja-pronta/produtos/recovered/<productId>/publish`. It requires the
existing Shopee configuration and pilot eligibility, plus
`SHOPEE_RECOVERED_PUBLICATION_ENABLED=true`. This separate switch does not enable the initial
five-product assistant publisher. Leave the switch unset during a code-only rollout; the interface
shows that publication is coming soon. Enabling this switch preserves the current pilot allowlist.

## Review and consent

Preparation reads the destination shop, categories, attribute tree, brands, upload limits and
shipping channels from Shopee. It does not upload media or create a listing. Customers enter
current costs and stock for every recovered variation, sale prices, package weight and dimensions,
barcodes when required, and the available shipping channels. These are seller-entered values;
they are not represented as an automatic supplier synchronization. Only new products are supported.

A separate summary shows the exact destination, photos, attributes, prices, costs, stock, barcodes
and packaging. Confirmation requires an unchecked consent field and the server fingerprint of
that summary. Reviews expire after 15 minutes. Editing the imported draft, changing the destination,
losing access or changing the immutable source invalidates authorization. Failed validation retains
entered values. Conditional attributes appear after their parent choices have been submitted.

The current adapter uses `seller_stock` for items and models. It supports one or two custom
variation axes and at most 50 complete combinations. Sparse combinations are blocked rather than
invented. Categories requiring a separate size chart or unsupported date/unit attributes must be
completed in Seller Center. Shipping modes requiring an unreviewed custom price or size identifier
are excluded. A new offer must be above its entered cost; customers still need to include current
Shopee fees in their price. The flow does not enable seller-funded free shipping.

## Durable delivery

The assistant worker claims only confirmed queue rows. It rechecks access, pilot/configuration,
ownership, source and draft fingerprints, destination connection, expiry and lease before network
operations. It checks the recovered SKU and any original listing in the same historical shop to
avoid duplicates. Private image bytes are resolved from an exact archive hash and verified before
upload; no customer URL or arbitrary remote file is fetched.

Each listing is created hidden (`UNLIST`). The worker records the returned item ID, waits at least
five seconds before initializing variations, verifies model coordinates, prices and stock, and only
then requests `NORMAL`. It reads the listing back before reporting success. The stored request
records the actual item/model stock adapter, media IDs and barcodes authorized by the customer.

A failure before listing creation becomes `blocked` and allows a fresh review. Any uncertain
listing write, interrupted sending lease or partial variation creation becomes `unknown`, with no
automatic listing retry. Customers are directed to Seller Center to inspect the result. Confirmed,
sending, unknown and published imports cannot be edited or silently prepared again. Import deletion
and account deletion cascade to their queue rows.

## Verification and rollout

Unit tests cover current offer requirements, fingerprints, consent, conditional attributes, GTIN
checksums and request conversion. Database tests cover tenant isolation, expired/stale reviews,
concurrent confirmations and claims, edit freezing, duplicate SKU checks, source/connection drift,
private media integrity, interrupted writes and read-back verification. Shopee transport is mocked
in these tests; no real customer listing is created during development.

Keep the existing pilot boundary until a real seller has reviewed and confirmed a suitable product
and the resulting live listing has been checked. Production publication must not be claimed as
validated solely from a mocked test or successful deployment.

The adapter was checked against the official API documentation on October 27, 2026:

- [Add item](https://open.shopee.com/documents/v2/v2.product.add_item?module=89&type=1)
- [Attribute tree](https://open.shopee.com/documents/v2/v2.product.get_attribute_tree?module=89&type=1)
- [Item limits](https://open.shopee.com/documents/v2/v2.product.get_item_limit?module=89&type=1)
- [Initialize variations](https://open.shopee.com/documents/v2/v2.product.init_tier_variation?module=89&type=1)
