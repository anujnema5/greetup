/**
 * CORS for public VoiceIQ REST API (API-key auth, no cookies).
 */

import { cors } from 'hono/cors'

export const corsMiddleware = cors({
  origin:       '*',
  allowHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
})
