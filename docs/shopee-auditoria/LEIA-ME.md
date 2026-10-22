# Shopee Open Platform review package

Prepared on 22 October 2026 for **Loja Pronta Prime**, operated by Mentalidade Sem Limite Ltda
(trade name: MSL). This package concerns a **new app**, separate from Escala Shop.

## Execution status: partner profile submitted and under review

On 22 October 2026, the owner confirmed that the existing CNPJ identifies the same business
with outdated registration details, authorized their correction and explicitly confirmed the
Data Protection Policy acceptance. The owner also confirmed telephone **+55 (37) 98805-2023**
and the **1,001–10,000** supported-seller range.

The corrected profile was successfully resubmitted. Shopee redirected to App List and showed
**Profile Under Review**: the submission is being reviewed and an email will be sent when
processed. Reopening the profile confirmed the persisted legal name, address, representative,
reviewer access fields, company-document attachment and seller range.

The legal entity is **MENTALIDADE SEM LIMITE LTDA** (trade name **MSL**); the product and new
app are **Loja Pronta Prime**. The registration attachment combines the CNPJ certificate and
articles of association. No identity documents beyond those required were uploaded.

App List is currently gated by partner-profile review and exposes no app-creation action.
Creating the new app, obtaining its sandbox credentials and submitting its Go Live therefore
require Shopee to complete this review first. Do not confuse partner-profile submission with
new-app Go Live submission. No new app ID has been issued in this workflow.

The earlier rejection said the test account does not provide enough information for validation
and requires a functional environment with active integrations. It also says products without
active integrations cannot proceed. The original message and a screenshot are preserved only
in the private execution record.

The designated reviewer account successfully signs in and opens
`https://lojaprontaprime.com/sll/minhas-lojas/conectar`. That account currently sees the
connection preparation notice, without an authorization button. A 1280 × 800 screenshot was
saved privately. A successful login alone does **not** resolve the rejection.

The partner profile has been submitted; no new app has been created, no new sandbox
credentials have been issued, and no app Go Live submission has been made in this execution. Escala Shop and production configuration have
not been changed. Phase B is not eligible. Do not describe this package as approval or as
proof that the new app's sandbox integration works.

## Package contents

- `PROMPT-CODEX.md`: execution runbook for registration, sandbox testing and Go Live, followed
  by production activation only after approval.
- `security-overview.md` and `security-overview.pdf`: unsigned security overview for review.
  A blank signature line is not a signature or independent certification.
- `gerar-pdf.ts`: regenerate the PDF from its Markdown source with
  `bun docs/shopee-auditoria/gerar-pdf.ts`.

Credentials, company identity documents, screenshots and detailed execution records stay in
`docs/private/` or the separate MSL directory. Never include them in this PR. If a signed
security document exists at `docs/shopee-auditoria/security-overview-assinado.pdf`, use it for
an explicitly requested upload; never fabricate a signature.

## Registration and Go Live fields

| Field                             | Value or source                                                                |
| --------------------------------- | ------------------------------------------------------------------------------ |
| Legal name                        | Mentalidade Sem Limite Ltda (trade name: MSL)                                  |
| CNPJ                              | 46.419.797/0001-67                                                             |
| Registered address                | Alameda Rio Negro, 503, Sala 2020, Alphaville, Barueri/SP, 06454-000, Brazil   |
| Representative                    | Guilherme Mendes Flauzino, Administrator                                       |
| Contact telephone                 | +55 (37) 98805-2023                                                            |
| Contact email                     | Email of the authenticated Open Platform account                               |
| Profile                           | Third-party Partner Platform (ISV), Brazil                                     |
| New app name                      | Loja Pronta Prime                                                              |
| App category                      | ERP System                                                                     |
| Live product URL                  | https://lojaprontaprime.com/                                                   |
| Reviewer login                    | `email` and `senhaFinal` in `docs/private/shopee-revisao-20261022/acesso.json` |
| Test and live redirect URL domain | https://lojaprontaprime.com/                                                   |
| Callback                          | https://lojaprontaprime.com/api/shopee/callback                                |
| IP whitelist                      | Enabled; 147.93.2.171                                                          |
| Other IT Assets: Database Servers | 147.93.2.171 (same server)                                                     |
| Other IT Assets: Other Servers    | None                                                                           |
| Buyer PII access                  | OFF                                                                            |
| App logo                          | `src/app/icon.png`                                                             |
| Client interface screenshot       | Private 1280 × 800 capture of the connection page using the reviewer account   |

Use the CNPJ certificate and articles of association in `/run/media/haniel/Developer/MSL/`.
Upload partner identity documents, a driver's license or an identity card only when required
by the form. Do not invent mandatory seller counts, platform integrations or other answers.

The reviewer account has access to both Loja Pronta and SLL. Its initial password change was
completed before this run; the final password is in the private credential record. Never copy
that password into repository content, screenshots, logs or PRs.

## Brief Introduction

> Loja Pronta Prime is a training and tools platform for beginner sellers in Brazil. After
> the seller authorizes her own shop, the app reads her products and their views and clicks,
> recommends which product line to focus on, and helps her create and update her own listings.
> It only accesses the authorized seller's own shop, does not access buyer personal data and
> does not move sales outside Shopee.

This describes the intended service scope. The current reviewer account does not have an
active connection, and publication and supplier import remain pending. Do not represent
planned functions as demonstrated integration evidence.

## Review requirements and operational follow-up

The preparatory research dated 22 October 2026 cites the official guides below for company
verification, a functional live product and reviewer login, HTTPS with TLS 1.2 or later and
an SSL Labs grade of at least A, screenshots, declared IPs and buyer PII requirements. It
reports up to 10 business days for review. Recheck the current form and guidance when
resuming; these notes do not override a rejection shown in the console.

The application does not request buyer personal data; keep the PII declaration OFF.
The preparatory research identifies pentest requirements for sensitive-data access in
Thailand, Malaysia, Singapore and the Philippines and for CNCB/HKCB ISVs. No independent
pentest has been performed for this package. If Shopee requires one, use an external
qualified tester; an automated scanner report is not equivalent.

The previous infrastructure notes report SSL Labs A+ on 22 October 2026. That result was not
independently rerun during this execution. They also identify follow-up work: SSH key-only
access, restricting direct web origin access to Cloudflare, panel 2FA, updates, off-server
database backups and 90-day security log retention. The security document distinguishes
policy commitments from verified implementation. The previous notes identify a missing
public privacy policy; verify and address it separately before representing it as complete.
Do not change production as part of Phase A.

Shopee's Data Protection Policy includes incident notification to `ssrc@sea.com` within
24 hours, data deletion obligations and possible security assessments. The unsigned overview
records the company's intended commitments; the legal representative must review them.

## Official references

- [Developer registration](https://open.shopee.com/developer-guide/12)
- [Sensitive data and penetration testing](https://open.shopee.com/developer-guide/718)
- [Data Protection Policy](https://open.shopee.com/developer-guide/32)
- [Go Live](https://open.shopee.com/developer-guide/741)
- [IP declaration](https://open.shopee.com/developer-guide/742)
- [Sandbox Testing V2](https://open.shopee.com/developer-guide/644)

## Resuming safely

Wait for Shopee's partner-profile decision. Resume the runbook once the corrected MSL profile
is approved and App List permits creating the new app. If rejected, preserve the exact reason
and correct only fields supported by evidence before retrying as authorized. The previous
rejection concerned functional integration evidence; do not assume registration corrections
alone satisfy that requirement. Record actual statuses privately.

Run Phase B only when the **new app** is Online. It requires a database backup, preservation
of the existing token encryption key, credentials from the new app and a pilot limited to
explicitly authorized test accounts. No Phase B action was performed during profile submission.
