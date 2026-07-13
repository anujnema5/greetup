# Database migrations on production deploy

GitHub Actions **cannot** run `bun run db:migrate` against DigitalOcean managed Postgres: runners are outside your VPC and blocked by **Trusted sources** (`ECONNREFUSED` on the public host).

## How migrations run (no extra cost)

The **server** container runs migrations automatically on every deploy **before** it starts listening:

```ts
// apps/server/src/index.ts
await runMigrations();
```

Migrations are idempotent (`schema_migrations` ledger skips files already applied).

### Deploy flow

1. Push to `main` → CI builds `server:latest` → pushes to DO registry.
2. Workflow triggers App Platform redeploy.
3. New **server** container starts → `runMigrations()` → app listens on port 5300.

No extra App Platform component (Job / Web Service) is required.

### Requirements

- **server** App Platform component has `DATABASE_URL` with `?sslmode=no-verify` (private host from `greetup-db`). Do **not** set a component override `${greetup-db.DATABASE_URL}` — it injects `sslmode=require` and breaks Node `pg`.
- Do **not** add a duplicate web service for migrations.

## Manual migrations (laptop)

From a machine whose IP is in Postgres **Trusted sources**:

```powershell
cd server
$env:DATABASE_URL="postgresql://doadmin:PASSWORD@PUBLIC-HOST:25060/greetup_db?sslmode=no-verify"
bun run db:migrate
```

## Do not use

| Approach | Why |
|----------|-----|
| GitHub Actions `db:migrate` | Runners cannot reach VPC Postgres |
| Extra Web Service for migrate | Unnecessary + extra monthly cost |
| Public Postgres open to `0.0.0.0/0` | Security risk |
| `DATABASE_URL` (private host) in GitHub secrets | Still unreachable from GHA |

Remove GitHub `RUN_DB_MIGRATIONS` and `DATABASE_URL` secrets if you added them for the old workflow migrate job.
