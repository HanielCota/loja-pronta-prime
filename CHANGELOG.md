# Changelog

Dates use the America/Sao_Paulo time zone. Operational verification and rollout limits are
recorded separately from code integration.

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
