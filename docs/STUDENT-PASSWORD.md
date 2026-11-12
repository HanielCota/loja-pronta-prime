# Student password and account recovery

New Hotmart and historical import accounts start without a password. When Hotmart approval creates
an account and grants access, the worker sends a one-time link to the purchase email. The link is
valid for one hour. Students can request another link from the login page with the purchase email.
Historical imports use that self-service flow. Repeated purchases preserve existing credentials and
product access.

The administrative student recovery action disables the current password and revokes sessions and
existing recovery links. Ask the student to request a fresh link from the login page. Admin promotion
similarly requires a fresh recovery link, including when the previous password was personal. Save any
email correction before promoting the account. Existing admins who keep their role keep their
personal credentials.

## Rollout

1. Verify that the authentication email sender is configured and that students receive recovery
   emails. After the first-access migration, verify that the worker sends the invitation for a new
   test purchase. Point students to the login page's recovery link if their invitation expires.
2. Stop old web and worker instances before switching traffic to the new release. Old versions can
   still accept or create the shared credential.
3. Run the normal production startup. Migration `0077_credential-security-and-delivery-review`
   marks pre-existing accounts for review, and the migrator checks the actual salted password hashes
   before the web server starts. It invalidates matching credentials, sessions and reset links,
   including for accounts already promoted to staff. It keeps unrelated credentials, active sessions,
   purchases and roles. Reviewed accounts are checkpointed so restarts can resume a partial run.

The optional maintenance command previews only counts and applies the same operation with `--apply`.
Run it after the schema migration if previewing or applying manually in a coordinated rollout.

```bash
bun --env-file=.env.local scripts/set-student-password.ts
bun --env-file=.env.local scripts/set-student-password.ts --apply
```

The standalone runtime includes the equivalent `node set-student-password.mjs` command. The scan
can identify accounts whose stored password still matches the retired credential. A password already
replaced before the rollout carries no evidence of who changed it. Review any suspected prior account
takeover separately.
