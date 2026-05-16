/**
 * Queue module entry point
 *
 * Re-exports the queue instances (for enqueueing jobs from routes)
 * and exposes start/stop functions for the workers.
 *
 * Usage in index.ts:
 *   import { scoringQueue, webhookQueue, startWorkers, stopWorkers } from './queue/index.ts'
 */

export { scoringQueue, webhookQueue } from './queues.ts'
export { startScoringWorker } from './workers/scoring.worker.ts'
export { startWebhookWorker } from './workers/webhook.worker.ts'
