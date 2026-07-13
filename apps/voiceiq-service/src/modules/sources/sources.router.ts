/**
 * Sources routes  /v1/sources/*
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware } from '@/middleware/auth.middleware.ts'
import { attachSchema } from './sources.schemas.ts'
import { sourcesService } from './sources.service.ts'

export const sourcesRouter = new Hono()

sourcesRouter.use('*', authMiddleware)

sourcesRouter.post('/attach', zValidator('json', attachSchema), async c => {
  const company = c.get('company')
  const body    = c.req.valid('json')
  const result  = await sourcesService.attach(company.id, body)

  if ('error' in result && result.error === 'not_found') {
    return c.json({ error: 'Session not found' }, 404)
  }
  if ('error' in result && result.error === 'bad_state') {
    return c.json({ error: `Session is "${result.status}" — cannot attach source` }, 409)
  }

  return c.json(result)
})

sourcesRouter.delete('/detach/:sessionId', async c => {
  const company   = c.get('company')
  const sessionId = c.req.param('sessionId')
  const result    = await sourcesService.detach(company.id, sessionId)

  if ('error' in result) return c.json({ error: 'Session not found' }, 404)
  return c.json(result)
})

sourcesRouter.get('/status', async c => {
  return c.json(sourcesService.listActive())
})

sourcesRouter.get('/status/:sessionId', async c => {
  const company   = c.get('company')
  const sessionId = c.req.param('sessionId')
  const result    = await sourcesService.statusForSession(company.id, sessionId)

  if ('error' in result) return c.json({ error: 'Session not found' }, 404)
  return c.json(result)
})
