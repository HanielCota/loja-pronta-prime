# Escala Shop member domain migration

The owner requested the Escala Shop platform name and `https://membros.escalashop.com.br`
as the canonical member address on October 26, 2026. Loja Pronta and SLL retain their product
names. The database, purchased access, student progress, storage, mascot and design remain the
same.

## Routing

- Browser pages on `lojaprontaprime.com` and `www.lojaprontaprime.com` redirect permanently
  to the same path and query on the member subdomain.
- `/api/hotmart/webhook`, health checks and other machine endpoints remain available on the
  old domain. Hotmart does not need to follow a redirect to deliver purchase events.
- Existing Shopee and Bling callback addresses redirect temporarily to the same callback on
  the member subdomain. This lets the browser send the session cookie created on the new host
  while preserving the registered provider callback URLs. Callback responses use `no-store`
  and `no-referrer`.
- Old authentication links redirect temporarily to the new host with their full token and
  query. The existing one-use token validation and expiry still apply.
- `leads.lojaprontaprime.com` keeps its current routing and trusted origin. The marketing site
  on `escalashop.com.br` is separate and remains in place.

Cookies are restricted to their host. Students sign in again on the new domain using their
existing email and password; a domain change does not move a browser cookie between domains.

## Deployment sequence

1. Save the original Coolify application and environment configuration and the member DNS record
   in a private local backup outside Git.
2. Add the new HTTPS hostname to the existing Coolify application while keeping its three
   existing hostnames. Apply routing before changing DNS.
3. Replace only the broken Vercel CNAME for `membros` with an A record for the verified application
   server, preserving DNS-only mode. Verify DNS propagation and a valid HTTPS certificate.
4. Publish the brand and redirect changes through a pull request to `main`. Set production
   `BETTER_AUTH_URL=https://membros.escalashop.com.br` when applying the release.
5. Verify sign-in, authenticated navigation, legacy links, callback bridges, health checks,
   and the unchanged Hotmart webhook URL. Check desktop and mobile in light and dark themes.

The verified sending address and support/privacy email addresses remain unchanged. Changing a
display name does not provision an email inbox or verify a new sending domain. Keep the old
domain registered and its DNS/HTTPS active while it receives old links and webhooks.

## Rollback

Restore the previous production `BETTER_AUTH_URL`, application domains and application image,
then restore the saved Vercel CNAME only if returning to that previous hosting is intended.
The former member CNAME already returned `DEPLOYMENT_NOT_FOUND` before this migration; restoring
that record alone does not recover the old Vercel application. No database rollback is needed
for this change.
