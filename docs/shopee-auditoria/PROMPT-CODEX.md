# Task: obtain Shopee Open Platform approval for Loja Pronta Prime

Use the browser and `/run/media/haniel/Developer/LojaProntaPrime`. The owner authorizes the
workflow without routine questions. Stop only a blocked step, record the reason, and continue
independent work. Never bypass a human intervention or browser security requirement.

## Objective

Register MSL as a Third-party Partner / ISV, create a **new** app named **Loja Pronta Prime**,
test it in sandbox and submit Go Live. Enable it on `https://lojaprontaprime.com/` only after
approval. Re-run this workflow for Phase B after the new app is Online.

## Required reading

- `AGENTS.md`.
- `docs/shopee-auditoria/LEIA-ME.md`.
- `docs/shopee-auditoria/security-overview.md` and `.pdf`.
- `docs/INTEGRACAO-SHOPEE.md`.
- `docs/private/SHOPEE.md` (private history, including the old app).
- `docs/private/shopee-revisao-20261022/acesso.json` (reviewer credentials).
- Company documents in `/run/media/haniel/Developer/MSL/`: CNPJ certificate, articles of
  association, partner documents, driver's license and identity card.

## Owner clarification on 22 October 2026

The owner confirmed that the current CNPJ identifies the same business and that the old
company name, address and contact are outdated. Correcting this existing profile from the MSL
documents is explicitly authorized. This resolves the earlier identity-mismatch blocker;
do not treat the old legal name alone as proof of another company. Keep Escala Shop untouched.

Use **MENTALIDADE SEM LIMITE LTDA** for the legal company name, **MSL** for its trade name,
and **Loja Pronta Prime** for the product and new app name. Do not substitute the product name
for the legal company name. Missing required information and browser action-time confirmations
still require the corresponding human input.

## Non-negotiable rules

1. **Do not use or change Escala Shop.** Do not change its domain, IPs, keys, name or status,
   reset its Partner Key, or revoke its shops. Another system may depend on it.
2. Never invent information. Use the MSL documents, repository and verified console evidence.
   Leave unavailable optional fields empty; record a blocker for missing required information.
3. Keep **Does this App require buyer PII access? OFF**. The site does not use buyer data.
4. Store secrets only in `docs/private/` (directories 700, files 600) and server Runtime
   variables in Coolify. Never commit passwords, Partner Keys or tokens, expose them in logs
   or public screenshots, or use `NEXT_PUBLIC_*` variables for secrets.
5. Never use a real student's account or authorize a real student's shop. Never create real
   listings during this workflow.
6. Keep IP whitelisting enabled. Do not bypass browser warnings, CAPTCHAs or 2FA.
7. Keep repository and GitHub content in English. Preserve proper names and existing paths.

## Form values

| Field                          | Value                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------- |
| Legal name                     | Mentalidade Sem Limite Ltda (trade name: MSL)                                |
| CNPJ                           | 46.419.797/0001-67                                                           |
| Address                        | Alameda Rio Negro, 503, Sala 2020, Alphaville, Barueri/SP, 06454-000, Brazil |
| Representative/contact         | Guilherme Mendes Flauzino, Administrator, +55 (37) 8805-2023                 |
| Contact email                  | Email of the authenticated Open Platform account                             |
| Profile                        | Third-party Partner Platform (ISV), Brazil                                   |
| App name                       | Loja Pronta Prime                                                            |
| Category                       | ERP System                                                                   |
| Live product URL               | https://lojaprontaprime.com/                                                 |
| Test username/password         | `email` / `senhaFinal` in the private `acesso.json`                          |
| Test/live redirect URL domain  | https://lojaprontaprime.com/                                                 |
| IP whitelist                   | Enabled, 147.93.2.171                                                        |
| Other IT Assets: Database      | 147.93.2.171 (same server)                                                   |
| Other IT Assets: Other Servers | None                                                                         |
| Logo                           | `src/app/icon.png`                                                           |
| Brief Introduction             | The Brief Introduction section in `LEIA-ME.md`                               |

Sign in to the live product using only the reviewer account, open
`https://lojaprontaprime.com/sll/minhas-lojas/conectar` and save a 1280 × 800 desktop
screenshot in `docs/private/shopee-revisao-20261022/`. Do not imply that a preparation notice
proves an active integration.

## Phase A: registration, new app and submission

1. Open `https://open.shopee.com/console` using the existing session. Inspect Personal Center /
   App List for profile type, company identity and verification status. If already approved
   as a Third-party Partner with MSL's details, proceed to step 3. If the profile belongs to
   another company or has another type, **do not change it**: record the blocker.
2. Submit the Third-party Partner profile with the table values. Use MSL's CNPJ certificate
   and articles of association. Upload partner identity documents only if required. Use the
   product URL and reviewer credentials for Services Information. Never claim integrations
   or seller counts without evidence.
3. Create a separate app with the specified name, ERP System category, logo and description.
   Record its Test Partner ID and save its Test Partner Key only in the private directory.
4. Follow [Sandbox Testing V2](https://open.shopee.com/developer-guide/644), create a BR test
   shop and validate authorization locally, without changing production:
   - Run `bun install`, `bun run db:up` and `bun run db:migrate` against a confirmed local
     development database. Never point these commands at production.
   - Start `bun run dev` using local-only `SHOPEE_ENABLED=true`,
     `SHOPEE_ENVIRONMENT=sandbox`, the **new app's** Test Partner ID and Test Partner Key,
     a fresh local `SHOPEE_TOKEN_ENCRYPTION_KEY` (32 random bytes in hexadecimal),
     `SHOPEE_CALLBACK_MODE=manual`, and
     `SHOPEE_REDIRECT_URI=https://lojaprontaprime.com/api/shopee/callback`.
   - Create a local test student with `bun run dev:aluna <email> <password>` and add her ID
     to `SHOPEE_PILOT_USER_IDS`. Satisfy the existing access and onboarding requirements
     documented in `docs/INTEGRACAO-SHOPEE.md`; do not weaken access checks.
   - From `/sll/minhas-lojas/conectar`, authorize only the sandbox shop. Copy the returned
     callback URL from the browser address bar into the local manual callback field.
     Treat the URL as a secret; never expose its code in logs or screenshots.
   - Confirm persistence and a successful `get_shop_info` response using the integration
     guide. Run `bun run typecheck`, `bun run lint` and `bun test src`.
   - If Shopee sandbox is unstable, record the exact error and continue to step 5. Missing
     new app credentials are a dependency blocker, not a successful sandbox test.
5. Fill the **new app's** Go Live sections: Product Brief, Authorization Information,
   enabled IP Address Whitelist, Other IT Assets and PII Necessity Declaration OFF. If a
   security document is requested, use `security-overview-assinado.pdf` if present; otherwise
   use `security-overview.pdf`. If an actual signature is mandatory and missing, record the
   blocker. Submit when the required fields and evidence are valid.
6. Verify the resulting status. Review may take up to 10 business days. Finish Phase A
   without waiting for approval. Record an actual rejection and correct supported fields
   before retrying once; do not overwrite a conflicting company profile.
7. Create branch `docs/shopee-review-package` from current `main`. Commit only
   `docs/shopee-auditoria/` using an English Conventional Commit with a body explaining why.
   Never commit `docs/private/`, identity documents, secrets or unrelated files. Open a PR
   to `main`, without AI coauthor lines or AI signatures. Preserve existing local work.

## Phase B: only after the new app is Online

1. Retrieve the **new app's** Live Partner ID and Live Partner Key; store them privately.
2. In Coolify, project `LojaPrime` → `production`, first record old Runtime values privately
   in `docs/private/SHOPEE.md`. Back up the database through Coolify **before deployment**.
   Apply:
   - `SHOPEE_PARTNER_ID` / `SHOPEE_PARTNER_KEY`: the new app's live credentials.
   - `SHOPEE_ENVIRONMENT=live`.
   - `SHOPEE_CALLBACK_MODE=automatic`; remove `SHOPEE_REDIRECT_URI`.
   - `SHOPEE_PILOT_USER_IDS`: add the ID of `revisao.shopee@lojaprontaprime.com`, found in
     `/admin/contas`, preserving IDs already explicitly authorized in the pilot.
   - Preserve the existing `SHOPEE_TOKEN_ENCRYPTION_KEY`; changing it loses stored tokens.
   - `SHOPEE_ENABLED=true`.
3. Redeploy. Verify `https://lojaprontaprime.com/api/health` and product sign-in.
4. With the reviewer account, verify that `/sll/minhas-lojas/conectar` shows an authorization
   button pointing to Shopee with the **new** Partner ID. Authorize a live shop only if it
   belongs to MSL itself; never authorize a student's shop.
5. In a separate PR, update `docs/INTEGRACAO-SHOPEE.md` to describe the new app, without secrets.

## Human intervention and blockers

Stop only the affected step and write the reason to
`docs/private/shopee-revisao-20261022/REGISTRO.md` when:

- Login, 2FA, a CAPTCHA, an email/SMS code or another human verification is unavailable.
- The authenticated profile belongs to another company or has another profile type.
- A required signature, field or document is missing from the MSL folder and repository.
- Shopee refuses submission: preserve the exact reason, correct what evidence supports and
  retry once if the profile identity is correct.

Do not treat these conditions as permission to bypass safeguards or fabricate evidence.
Continue independent documentation, screenshots and checks when possible.

## Private record and final report

Record local date/time, submitted fields, screenshots, non-secret IDs, statuses and exact
errors in `REGISTRO.md`. Keep credentials separate and private. Distinguish blocked, attempted,
submitted and approved steps. Report in simple Brazilian Portuguese: what is complete, the
actual profile/app status, and what remains and who must resolve it. Do not claim submission,
a sandbox connection or deployment unless verified.
