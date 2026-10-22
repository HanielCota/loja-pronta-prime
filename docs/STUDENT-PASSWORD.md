# Student initial password

New Hotmart student accounts use `loja1234` and have a verified email. No password change is required at first access. Existing accounts keep their credentials when another purchase arrives. Manual account creation keeps the access method selected by the administrator.

The shared initial password allows anyone who knows a student's email to attempt access until the student replaces it. Distribute access instructions directly to students.

## One student cannot sign in

On the account page in the admin panel, **Voltar para a senha inicial** sets that student's password back to `loja1234`. It applies only to accounts with the `user` role or no role, verifies the email, disables the mandatory password change, and revokes sessions and outstanding password reset links in one transaction (`src/server/auth/reset-student-password.ts`).

Passwords from the previous delivery system were never imported: that system had no login accounts. Accounts that existed here before the legacy import keep the password they already had, which for older Hotmart accounts is a random one. Use this button, or the student's own **Redefinir minha senha** link, in those cases. If the email is not found at all, the account does not exist yet; check the purchase email before creating one.

## Existing accounts

Use the maintenance script against the intended database. It previews the number of eligible accounts by default; it does not print student emails or password hashes.

```bash
# Preview accounts already marked for a mandatory password change.
bun --env-file=.env.local scripts/set-student-password.ts

# Apply to those accounts.
bun --env-file=.env.local scripts/set-student-password.ts --apply

# Preview all students, including students with personal passwords.
bun --env-file=.env.local scripts/set-student-password.ts --all-students

# Replace all student passwords, including personal passwords.
bun --env-file=.env.local scripts/set-student-password.ts --all-students --apply
```

Only accounts with the `user` role or no role qualify. Administrative and custom roles are excluded. Applying the update verifies the email, disables the mandatory first-access password change, revokes sessions and outstanding password reset links, and changes credentials in one transaction. Blocked status and product access remain as configured.

Legacy Hotmart accounts were created with random passwords and `mustChangePassword: false`. They are included only with `--all-students`; the old flag cannot distinguish them from students who have already chosen personal passwords. Take this into account when selecting the scope.

Run the script once when switching existing accounts to the new access method. Running it again replaces personal passwords again for the selected accounts. This script is not part of application startup or deployment.

## Production runtime

The build includes `set-student-password.mjs` in the application runtime. In the running application container, which already has the production `DATABASE_URL`, run:

```bash
# Preview all student accounts.
node set-student-password.mjs --all-students

# Apply the update to all student accounts, including personal passwords.
node set-student-password.mjs --all-students --apply
```

The command is never invoked automatically by the build or application startup.

Migration `0058_keep-student-default-password` removes the mandatory password change from existing student accounts once. It preserves their stored passwords and leaves administrative roles unchanged. Students may still voluntarily change their password through the existing recovery or profile flows.
