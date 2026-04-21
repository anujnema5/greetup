/**
 * Applies `migration/*.sql` in lexical order.
 * Tracks applied files in `public.schema_migrations` (no repo journal/snapshots required).
 *
 * If the DB was migrated with `drizzle-kit migrate` before, rows in `drizzle.__drizzle_migrations`
 * are used once to seed `schema_migrations` so existing databases do not re-apply old SQL.
 */

import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = resolve(__dirname, "../../..");
const MIGRATION_DIR = join(__dirname, "migration");

const STATEMENT_BREAKPOINT = "--> statement-breakpoint";

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

function splitExecutableChunks(sqlFileContents: string): string[] {
  return sqlFileContents
    .split(STATEMENT_BREAKPOINT)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

async function listMigrationFiles(): Promise<string[]> {
  const names = await readdir(MIGRATION_DIR);
  return names
    .filter((n) => n.endsWith(".sql") && !n.startsWith("."))
    .sort((a, b) => a.localeCompare(b));
}

async function ensureTrackingTable(client: pg.PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

/**
 * One-time bridge from Drizzle Kit’s `drizzle.__drizzle_migrations` row count
 * (ordered migrations) → our filename-based ledger.
 */
async function seedLedgerFromDrizzleIfNeeded(
  client: pg.PoolClient,
  orderedFiles: string[],
): Promise<void> {
  const { rows: applied } = await client.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM schema_migrations`,
  );
  if ((applied[0]?.n ?? 0) > 0) {
    return;
  }

  const { rows: reg } = await client.query<{ c: string | null }>(
    `SELECT to_regclass('drizzle.__drizzle_migrations')::text AS c`,
  );
  if (!reg[0]?.c) {
    return;
  }

  const { rows: countRows } = await client.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM drizzle.__drizzle_migrations`,
  );
  const legacyCount = countRows[0]?.n ?? 0;
  if (legacyCount <= 0) {
    return;
  }

  if (legacyCount > orderedFiles.length) {
    throw new Error(
      `drizzle.__drizzle_migrations has ${legacyCount} entries but only ${orderedFiles.length} SQL files exist; resolve manually.`,
    );
  }

  await client.query("BEGIN");
  try {
    for (let i = 0; i < legacyCount; i++) {
      await client.query(`INSERT INTO schema_migrations (filename) VALUES ($1)`, [
        orderedFiles[i],
      ]);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }

  console.log(
    `[migrate] Seeded schema_migrations from ${legacyCount} legacy Drizzle migration(s).`,
  );
}

async function isFileApplied(client: pg.PoolClient, filename: string): Promise<boolean> {
  const { rows } = await client.query(`SELECT 1 FROM schema_migrations WHERE filename = $1`, [
    filename,
  ]);
  return rows.length > 0;
}

async function markApplied(client: pg.PoolClient, filename: string): Promise<void> {
  await client.query(`INSERT INTO schema_migrations (filename) VALUES ($1)`, [filename]);
}

async function applySqlFile(client: pg.PoolClient, filename: string): Promise<void> {
  const fullPath = join(MIGRATION_DIR, filename);
  const raw = await readFile(fullPath, "utf8");
  const chunks = splitExecutableChunks(raw);
  if (chunks.length === 0) {
    return;
  }

  await client.query("BEGIN");
  try {
    for (const chunk of chunks) {
      await client.query(chunk);
    }
    await markApplied(client, filename);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}

export async function runMigrations(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.trim()) {
    throw new Error("DATABASE_URL is not set (check env/.env.development or .env under server/).");
  }

  const files = await listMigrationFiles();
  if (files.length === 0) {
    console.log("[migrate] No .sql files in migration/; nothing to do.");
    return;
  }

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();

  try {
    await ensureTrackingTable(client);
    await seedLedgerFromDrizzleIfNeeded(client, files);

    for (const name of files) {
      if (await isFileApplied(client, name)) {
        continue;
      }
      console.log(`[migrate] Applying ${name}…`);
      await applySqlFile(client, name);
      console.log(`[migrate] Applied ${name}`);
    }

    console.log("[migrate] Done.");
  } finally {
    client.release();
    await pool.end();
  }
}

// CLI entrypoint
if (import.meta.main) {
  loadDatabaseEnv();
  runMigrations().catch((err) => {
    console.error("[migrate] Failed:", err);
    process.exit(1);
  });
}
