/**
 * Bot routes  /v1/bot/*
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '@/middleware/auth.middleware.ts'
import { botService } from './bot.service.ts'

export const botRouter = new Hono()

botRouter.use('*', authMiddleware)

const joinSchema = z.object({
  meeting_url: z.string().url(),
  rubric:      z.string().optional(),
  notify_url:  z.string().url().optional(),
})

botRouter.post('/join', zValidator('json', joinSchema), async c => {
  const company = c.get('company')
  const body    = c.req.valid('json')
  const result  = await botService.joinMeeting(company.id, body)
  return c.json(result)
})

botRouter.post('/:botId/heartbeat', async c => {
  const botId  = c.req.param('botId')
  const result = await botService.heartbeat(botId)
  return c.json(result)
})

botRouter.post('/:botId/end', async c => {
  const company = c.get('company')
  const botId   = c.req.param('botId')
  const result  = await botService.endMeeting(company.id, botId)

  if ('error' in result) return c.json({ error: 'Session not found' }, 404)
  return c.json(result)
})
