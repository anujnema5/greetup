/**
 * Builds the HTTP application — same responsibility as main `server` `http/create-app`.
 *
 * WebSocket upgrades, workers, and process shutdown stay in `src/index.ts`.
 */

import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { apiRouter } from '@/http/api.router.ts'
import { corsMiddleware } from '@/http/cors.ts'
import { HTTP_PATHS } from '@/http/paths.ts'

export function createApp(): Hono {
  const app = new Hono()

  app.use('*', logger())
  app.use('*', corsMiddleware)

  app.get(HTTP_PATHS.health, c => c.json({ status: 'ok', service: 'voiceiq' }))

  app.route(HTTP_PATHS.apiV1, apiRouter)

  app.notFound(c => c.json({ error: 'Not found' }, 404))

  return app
}

export default createApp
