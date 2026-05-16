/**
 * Authentication + rate-limiting middleware
 *
 * Every protected route runs this middleware. It does two things:
 *
 *   1. API key validation  — looks up the company in PostgreSQL.
 *      Key can be passed as `x-api-key` header or `Authorization: Bearer <key>`.
 *
 *   2. Hourly rate limiting — counts calls in a rolling 1-hour bucket stored in Redis.
 *      Limit is per-company and set on the `companies` table (plan-based).
 *
 * On success, the company record is attached to the Hono context (`c.get('company')`)
 * so route handlers don't need to re-query the DB.
 */

import type { Context, Next } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '@/core/database/index.ts'
import { companies } from '@/core/database/schema/index.ts'
import { redis, VOICEIQ_KEYS } from '@/core/redis/index.ts'

// Extend Hono's context variable map so `c.get('company')` is typed
declare module 'hono' {
  interface ContextVariableMap {
    company: typeof companies.$inferSelect
  }
}

export async function authMiddleware(c: Context, next: Next) {
  // Accept key via either header format
  const apiKey =
    c.req.header('x-api-key') ??
    c.req.header('authorization')?.replace('Bearer ', '')

  if (!apiKey) {
    return c.json({ error: 'Missing API key' }, 401)
  }

  // DB lookup — company record doubles as the auth token
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.apiKey, apiKey))
    .limit(1)

  if (!company) {
    return c.json({ error: 'Invalid API key' }, 401)
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────
  // One Redis key per (apiKey, hour). INCR is atomic so concurrent requests
  // can't race past the limit.
  const hourKey   = VOICEIQ_KEYS.rateLimit(apiKey, hourSlot())
  const callCount = await redis.incr(hourKey)

  // Set TTL on first request in this bucket so the key self-cleans
  if (callCount === 1) {
    await redis.expire(hourKey, 3_600)
  }

  if (callCount > company.hourlyRateLimit) {
    return c.json(
      {
        error:      'Rate limit exceeded',
        retryAfter: secondsUntilNextHour(),
      },
      429,
    )
  }

  c.set('company', company)
  await next()
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a string like "2024-1-15-14" — unique per UTC hour */
function hourSlot(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}`
}

/** How many seconds remain until the current hour bucket resets */
function secondsUntilNextHour(): number {
  const now  = new Date()
  const next = new Date(now)
  next.setUTCHours(now.getUTCHours() + 1, 0, 0, 0)
  return Math.ceil((next.getTime() - now.getTime()) / 1_000)
}
