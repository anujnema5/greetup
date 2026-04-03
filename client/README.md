# client

Next.js app (App Router), Redux Toolkit Query for API calls, Tailwind.

## Run

```bash
npm install
npm run dev
# http://localhost:3000
```

## Layout & conventions

| Area | Purpose |
|------|---------|
| `src/app/` | Routes, layouts, `app/api` if any route handlers |
| `src/features/<feature>/` | Feature slices: `api/` (RTK `injectEndpoints`), `components/`, `hooks/`, `types/`, `schemas/` (Zod forms), `constants/` |
| `src/features/<feature>/types/` | DTOs and UI types for that feature (e.g. `*-api.types.ts` aligned with server endpoints) |
| `src/lib/` | Shared app utilities, `api/` base RTK setup |
| `src/shared/` | Cross-cutting constants, env helpers |

**Naming**

- Components: `PascalCase` files for React components.
- API modules: `something-api.ts` under `features/<name>/api/`.
- Types: `PascalCase`; shared shapes with the server use the same name where possible (e.g. `MyProfileResponse` in `features/profile/types/my-profile.types.ts`).

**Data fetching**

- Prefer RTK Query endpoints in feature `api/` files; tag types are declared in `src/lib/api/base-api.ts`.
- Mutations from RTK Query expose **`isLoading`** (not `isPending`) for the pending flag with current typings.

**Imports**

- Path alias: `@/` → `src/`.
