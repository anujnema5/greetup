/**
 * VoiceIQ service — process bootstrap (`server`-style: `http/create-app` + runtime wiring).
 */

import { serve } from '@hono/node-server'
import type { Server as HttpServer } from 'node:http'
import { WebSocketServer } from 'ws'
import createApp from '@/http/create-app.ts'
import config from '@/shared/config/config.ts'
import logger from '@/core/logging'
import { startScoringWorker, startWebhookWorker } from '@/queue/index.ts'
import { sourceManager } from '@/sources/source-manager.ts'

const app = createApp()

const httpServer = serve({
  fetch:    app.fetch,
  port:     config.port,
  hostname: '0.0.0.0',
}) as HttpServer

const wss = new WebSocketServer({ noServer: true })
sourceManager.init(wss)

httpServer.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url ?? '/', 'ws://localhost')

  if (!url.pathname.startsWith('/v1/sources/ws/')) {
    socket.destroy()
    return
  }

  const token = url.searchParams.get('token') ?? ''
  if (!token) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    socket.destroy()
    return
  }

  wss.handleUpgrade(req, socket, head, ws => {
    wss.emit('connection', ws, req)
  })
})

const scoringWorker = startScoringWorker()
const webhookWorker = startWebhookWorker()

scoringWorker.on('failed', (job, err) => {
  logger.error(`[scoring-worker] job ${job?.id} failed: ${err.message}`)
})
webhookWorker.on('failed', (job, err) => {
  logger.error(`[webhook-worker] job ${job?.id} failed: ${err.message}`)
})

async function shutdown() {
  logger.info('Shutting down VoiceIQ service…')
  wss.close()
  httpServer.close()
  await sourceManager.shutdown()
  await scoringWorker.close()
  await webhookWorker.close()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT',  shutdown)

logger.info(`VoiceIQ service  →  http://0.0.0.0:${config.port}`)
logger.info(`WebSocket stream →  ws://0.0.0.0:${config.port}/v1/sources/ws/:sessionId`)
