# server

Main API (Hono, Bun): auth (Better Auth), REST routes, Socket.io (Bun engine), internal webhooks.

## Run

Copy and configure environment (see `env/.env.example` → `env/.env.development`).

Requires [Bun](https://bun.sh) (see `packageManager` in `package.json`).

```bash
bun install
bun run dev
# http://localhost:5300
```

## Database

```bash
bun run db:generate   # Drizzle migrations from schema
bun run db:migrate    # apply migrations (required after pulling schema changes)
bun run db:studio     # optional Drizzle Studio
bun run db:seed       # seed scripts
```

## Layout & conventions

| Area | Purpose |
|------|---------|
| `src/modules/<feature>/` | Vertical slices: `router.ts`, `controllers/`, `services/`, `schemas/`, `types/`, `repositories/` (when DB is used) |
| `src/modules/<feature>/types/` | Request/response and domain types for that feature — **import types from here** (not re-exported from services) |
| `src/modules/<feature>/repositories/` | Drizzle/Postgres access only — **repository pattern** for DB operations |
| `src/modules/<feature>/services/` | Business logic; calls repositories, other services, or external HTTP |
| `src/modules/<feature>/schemas/` | Zod schemas for query/body validation |
| `src/shared/messages/` | User-facing API strings (e.g. safe generic copy for **5xx** — never return raw DB/query errors to clients) |
| `src/middleware/` | `auth`, `error`, `internal`, etc. |
| `src/core/database/` | Drizzle `db`, schema, migrations under `migration/` |

**Naming**

- Files: `kebab-case` for routes/schemas (`create-circle.schema.ts`), `*.service.ts`, `*.repository.ts`, `*.controller.ts`.
- Types: `PascalCase` for interfaces/types; shared API payloads often end in `Body`, `Result`, `Response` where it helps.

**Errors**

- Operational errors: typed errors or Zod — safe messages to the client.
- Unexpected failures: log full detail server-side; JSON uses `CLIENT_SAFE_INTERNAL_MESSAGE` from `@/shared/messages` (and consistent `code` fields for clients).
