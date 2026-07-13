/**
 * Database client — Drizzle + node-postgres pool (mirrors main `server` `core/database`).
 */

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '@/core/database/schema/index.ts'
import config from '@/shared/config/config.ts'

export const pool = new Pool({ connectionString: config.db.url })

export const db = drizzle(pool, { schema })

export type DB = typeof db
