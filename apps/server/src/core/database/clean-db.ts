/**
 * Deletes ALL row data from every table in the `public` schema, then resets
 * identity sequences. Schema and migration history are preserved:
 *   - Tables/columns/indexes are kept (only the data is removed).
 *   - `public.schema_migrations` is kept intact so `db:migrate` does NOT re-run.
 *
 * After cleaning, re-populate lookups/dev data with the `db:seed*` scripts.
 *
 * Usage:
 *   bun run db:clean            # prompts for a typed confirmation
 *   bun run db:clean --yes      # skips the prompt (for CI/scripts)
 *
 * Safety: refuses to run when DATABASE_URL looks like a hosted/production
 * database unless `--force` is also passed.
 */

import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import pg from "pg";

const SERVER_ROOT = process.cwd();

/** Tables that hold operational state we must never truncate here. */
const PRESERVE_TABLES = new Set<string>(["schema_migrations"]);

/** Hostname fragments that indicate a managed/production database. */
const PRODUCTION_HOST_HINTS = [
  "rds.amazonaws.com",
  "neon.tech",
  "supabase.co",
  "render.com",
  "railway.app",
  "planetscale",
  "prod",
];

function loadDatabaseEnv(): void {
  for (const rel of ["env/.env.development", ".env"]) {
    const p = resolve(SERVER_ROOT, rel);
    if (existsSync(p)) {
      loadEnv({ path: p });
      return;
    }
  }
  loadEnv({ path: resolve(SERVER_ROOT, ".env") });
}

function looksLikeProduction(databaseUrl: string): boolean {
  const lower = databaseUrl.toLowerCase();
  return PRODUCTION_HOST_HINTS.some((hint) => lower.includes(hint));
}

/** Human-readable "host/db" summary that never leaks credentials. */
function describeTarget(databaseUrl: string): string {
  try {
    const u = new URL(databaseUrl);
    const db = u.pathname.replace(/^\//, "") || "(default)";
    return `${u.hostname}:${u.port || "5432"}/${db}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

async function listPublicTables(client: pg.PoolClient): Promise<string[]> {
  const { rows } = await client.query<{ tablename: string }>(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  return rows.map((r) => r.tablename).filter((t) => !PRESERVE_TABLES.has(t));
}

async function confirmInteractively(target: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(
      `\n⚠️  This will DELETE ALL DATA in: ${target}\n` +
        `   (schema + migration history are kept)\n` +
        `   Type "clean" to proceed: `,
    );
    return answer.trim().toLowerCase() === "clean";
  } finally {
    rl.close();
  }
}

async function cleanDatabase(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.trim()) {
    throw new Error("DATABASE_URL is not set (check env/.env.development or .env under server/).");
  }

  const argv = process.argv.slice(2);
  const skipPrompt = argv.includes("--yes") || argv.includes("-y");
  const force = argv.includes("--force");

  const target = describeTarget(databaseUrl);

  if (looksLikeProduction(databaseUrl) && !force) {
    throw new Error(
      `Refusing to clean what looks like a production database (${target}).\n` +
        `If you are certain, re-run with --force.`,
    );
  }

  if (!skipPrompt) {
    const ok = await confirmInteractively(target);
    if (!ok) {
      console.log("Aborted. No data was deleted.");
      return;
    }
  }

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();

  try {
    const tables = await listPublicTables(client);
    if (tables.length === 0) {
      console.log("[clean] No tables to truncate in public schema.");
      return;
    }

    // Quote every identifier; CASCADE handles FK ordering, RESTART IDENTITY
    // resets serial/identity sequences back to their start value.
    const quoted = tables.map((t) => `"public"."${t.replace(/"/g, '""')}"`).join(", ");

    console.log(`[clean] Truncating ${tables.length} table(s) in ${target}…`);
    await client.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);

    console.log(`[clean] Done. Preserved: ${[...PRESERVE_TABLES].join(", ") || "(none)"}.`);
    console.log("[clean] Re-seed with: bun run db:seed  (then db:seed:dev-users, etc.)");
  } finally {
    client.release();
    await pool.end();
  }
}

if (import.meta.main) {
  loadDatabaseEnv();
  cleanDatabase().catch((err) => {
    console.error("[clean] Failed:", err);
    process.exit(1);
  });
}
