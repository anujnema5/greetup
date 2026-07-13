import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/core/database/schema";

export type SeedDb = NodePgDatabase<typeof schema>;

function loadSeedEnv(): void {
  const root = process.cwd();
  for (const relPath of ["env/.env.development", ".env"]) {
    const fullPath = resolve(root, relPath);
    if (existsSync(fullPath)) {
      loadEnv({ path: fullPath });
      return;
    }
  }
}

function requireDatabaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error("DATABASE_URL is required for running seed scripts.");
  }
  return value;
}

export function createSeedDb(): { db: SeedDb; pool: Pool } {
  loadSeedEnv();
  const pool = new Pool({
    connectionString: requireDatabaseUrl(),
    max: 1,
  });

  const db = drizzle(pool, { schema, casing: "snake_case" });
  return { db, pool };
}
