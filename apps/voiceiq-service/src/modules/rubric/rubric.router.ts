/**
 * Rubric routes  /v1/rubrics/*
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '@/middleware/auth.middleware.ts'
import { rubricService } from './rubric.service.ts'

export const rubricRouter = new Hono()

rubricRouter.use('*', authMiddleware)

const createRubricSchema = z.object({
  name:    z.string().min(1),
  context: z.string().optional(),
  dimensions: z
    .array(
      z.object({
        key:       z.string(),
        weight:    z.number().min(0).max(1),
        min_score: z.number().min(0).max(100).optional(),
      }),
    )
    .optional(),
  auto_reject_below: z.number().min(0).max(100).optional(),
})

rubricRouter.post('/', zValidator('json', createRubricSchema), async c => {
  const company = c.get('company')
  const body    = c.req.valid('json')
  const result  = await rubricService.create(company.id, body)
  return c.json(result, 201)
})

rubricRouter.get('/', async c => {
  const company = c.get('company')
  const result  = await rubricService.list(company.id)
  return c.json(result)
})

rubricRouter.get('/:id', async c => {
  const company = c.get('company')
  const id      = c.req.param('id')
  const result  = await rubricService.getForCompany(company.id, id)

  if ('error' in result) return c.json({ error: 'Rubric not found' }, 404)
  return c.json(result)
})
