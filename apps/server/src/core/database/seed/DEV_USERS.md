# Dev seed users

These accounts are for **local development and testing only**. They are created by `bun run db:seed:dev-users` after the main lookup seed (`bun run db:seed`).

- **Credentials:** see `dev-users.credentials.csv` (same password for every row).
- **Emails:** `seed01@greetup.local` … `seed12@greetup.local` — safe to delete and re-seed; the script removes existing rows with these emails first.
- **Auth:** Uses the same password hashing as Better Auth (`better-auth/crypto`).

Do not use these passwords in production.
