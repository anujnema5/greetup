/**
 * Versioned HTTP API — mounted at `/v1` from `app.ts`.
 */

import { Hono } from 'hono'
import { botRouter } from '@/modules/bot/bot.router.ts'
import { rubricRouter } from '@/modules/rubric/rubric.router.ts'
import { sessionRouter } from '@/modules/session/session.router.ts'
import { sourcesRouter } from '@/modules/sources/sources.router.ts'

export const apiRouter = new Hono()

apiRouter.route('/session', sessionRouter)
apiRouter.route('/bot', botRouter)
apiRouter.route('/rubrics', rubricRouter)
apiRouter.route('/sources', sourcesRouter)
