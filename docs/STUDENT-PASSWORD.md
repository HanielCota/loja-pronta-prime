# Student initial password

New Hotmart student accounts use `loja1234` and have a verified email. Students must choose a different personal password at first access. Existing accounts keep their credentials when another purchase arrives. Manual account creation keeps the access method selected by the administrator.

The shared initial password allows anyone who knows a student's email to attempt access until the student replaces it. Distribute access instructions directly to students.

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

Only accounts with the `user` role or no role qualify. Administrative and custom roles are excluded. Applying the update verifies the email, requires a new personal password, revokes sessions and outstanding password reset links, and changes credentials in one transaction. Blocked status and product access remain as configured.

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
