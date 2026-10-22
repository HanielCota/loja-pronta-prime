# Automatic brand publication and banner kit

Implemented on October 22, 2026. This describes repository behavior, not a live Shopee validation or production activation.

## Brand publication

Confirming the brand records a SHA-256 fingerprint of its name, description and saved logo key. Saving any brand field clears this authorization. Revising a confirmed brand therefore requires confirming it again. Existing confirmed brands have no implicit publication authorization after the migration; their owners must review and confirm them once. The product page links to a dedicated publication review that also works for completed journeys without reopening locked editing steps.

The assistant worker scans confirmed brands every minute. A matching live connection, effective Loja Pronta entitlement, eligible account and pilot permission are required. Brands confirmed before connection or while publication is disabled are picked up later. The supplier catalog is not required.

`SHOPEE_BRAND_PUBLICATION_ENABLED=true` enables this operation independently of `SHOPEE_PUBLICATION_ENABLED`, which controls product changes. It defaults to disabled. The existing Shopee configuration, enabled integration, encryption key and worker are still required. Do not enable live writes before validating the application's profile/media permissions and a controlled real-shop pilot.

The worker uploads the saved logo through `media_space/upload_image` and queues `shop/update_profile`. A job is tied to its owner, application, shop and confirmed fingerprint. Another pending, running or uncertain brand write prevents a newer write. The worker rejects obsolete confirmations before dispatch. A successful response is followed by `shop/get_profile`; completion requires the expected name, description and logo URL. A mismatch, interrupted write or ambiguous response remains uncertain. Periodic reconciliation reads the remote profile without resending it. Definite failures can be retried explicitly from the product page while the same confirmed brand and connection remain valid.

The current comparison requires an exact logo URL match. Validate Shopee's returned URL behavior during the real pilot; a rewritten URL must remain uncertain until an equivalence rule is supported by evidence.

## Banner kit

The dashboard and completed-brand screen link to `/loja-pronta/marca/banners`. Access requires Loja Pronta and a completed brand with a logo. Two deterministic PNG compositions use the saved logo, store name, editable welcome text, selection text and one of four artwork palettes. This does not call a paid image-generation service or invent products, discounts or delivery promises.

The files are 750 × 300 and 750 × 500 pixels. These are exported artwork dimensions, not a guarantee that every Brazilian Shopee decoration block accepts them. The user is instructed to check the selected block's current requirements and preview any crop in Shopee.

Saving a draft generates a new revision and clears approval. Approval checks both the submitted revision and current brand fingerprint under a database lock. Concurrent stale edits and approvals are rejected. Private image routes check the active owner, entitlement, onboarding, current brand and exact revision. Downloads additionally require approval. All image responses are private and uncached. Images are rendered from persisted draft data and the private logo; no public bucket URL is exposed. A brand change invalidates preview and download until a new draft is saved and approved.

The page explains how to upload images, set optional links, preview and publish in Seller Centre. Approval and download never claim that the decoration was published. No undocumented Seller Centre API, stored seller password or browser-session automation is implemented.

## Deployment and verification

Apply migration `0063_automatic-brand-and-banner-kit.sql` using the normal migration workflow. Keep the brand-publication flag disabled until the external pilot is verified. No new external service is needed for banners; the existing logo bucket and Sharp renderer are used.

Focused checks:

```sh
bun run typecheck
bun run lint
bun test src
bun run test:integration
bun run test:e2e --config=playwright.banner-kit.config.ts
```

The banner browser suite covers desktop/mobile, light/dark, accessibility, private previews, approval before download, draft/brand invalidation and forms without JavaScript. It uses isolated accounts and temporary logos in the configured bucket and cleans them up. Integration tests exercise actual PostgreSQL transactions and PNG generation; Shopee transports are simulated and do not establish external API permission.
