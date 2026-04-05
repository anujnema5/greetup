import { defineConfig } from "drizzle-kit";

/**
 * - `db:generate` writes SQL + optional `migration/meta/` snapshots for diffs.
 * - `db:migrate` uses `src/core/database/run-migrations.ts` (applies `migration/*.sql` in order;
 *   tracks progress in `public.schema_migrations`, not `_journal.json`).
 */
const databaseConfig = defineConfig({
  out: "./src/core/database/migration",
  dialect: "postgresql",
  schema: "./src/core/database/schema",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  casing: "snake_case",
});

export default databaseConfig;