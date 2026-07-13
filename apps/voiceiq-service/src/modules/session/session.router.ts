/**
 * Session routes  /v1/session/*
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '@/middleware/auth.middleware.ts'
import { sessionService } from './session.service.ts'

export const sessionRouter = new Hono()

sessionRouter.use('*', authMiddleware)

const createSessionSchema = z.object({
  rubric:       z.string().optional(),
  participants: z.array(z.string()).optional(),
  notify_url:   z.string().url().optional(),
})

sessionRouter.post('/', zValidator('json', createSessionSchema), async c => {
  const company = c.get('company')
  const body    = c.req.valid('json')
  const result  = await sessionService.createSession(company.id, body)
  return c.json(result, 201)
})

const audioSchema = z.object({
  transcript:        z.string().min(1),
  embedding:         z.array(z.number()).length(512).optional(),
  participant_name:  z.string().optional(),
  participant_email: z.string().email().optional(),
})

sessionRouter.post('/:id/audio', zValidator('json', audioSchema), async c => {
  const company   = c.get('company')
  const sessionId = c.req.param('id')
  const body      = c.req.valid('json')

  const result = await sessionService.submitAudioWindow(company.id, sessionId, body)

  if ('error' in result && result.error === 'not_found') {
    return c.json({ error: 'Session not found' }, 404)
  }
  if ('error' in result && result.error === 'bad_state') {
    return c.json({ error: `Session is ${result.status}` }, 409)
  }

  return c.json(result)
})

sessionRouter.post('/:id/end', async c => {
  const company   = c.get('company')
  const sessionId = c.req.param('id')
  const result    = await sessionService.endSession(company.id, sessionId)

  if ('error' in result) return c.json({ error: 'Session not found' }, 404)
  return c.json(result)
})

sessionRouter.get('/:id/results', async c => {
  const company   = c.get('company')
  const sessionId = c.req.param('id')
  const result    = await sessionService.getResults(company.id, sessionId)

  if ('error' in result) return c.json({ error: 'Session not found' }, 404)
  return c.json(result)
})

sessionRouter.get('/:id/live', async c => {
  const company   = c.get('company')
  const sessionId = c.req.param('id')
  const result    = await sessionService.getLiveScores(company.id, sessionId)

  if ('error' in result) return c.json({ error: 'Session not found' }, 404)
  return c.json(result)
})
