import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '@/core/database/schema'
import logger from '@/core/logging'
import config from '@/shared/config/config'

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
})

export const db = drizzle(pool, { schema, casing: 'snake_case' })

export const checkDbConnection = async () => {
  try {
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    logger.info('[DB] ✅ Database connection established')
    return true
  } catch (err) {
    logger.error('[DB] ❌ Database connection failed', err)
    return false
  }
}

await checkDbConnection()
