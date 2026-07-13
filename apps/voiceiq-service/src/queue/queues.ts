/**
 * BullMQ queue definitions
 *
 * Two queues, both backed by the same Redis instance:
 *
 *   scoring-jobs  — one job per 30-second audio window per participant
 *                   worker calls Claude, persists scores, updates Redis live cache
 *
 *   webhook-jobs  — one job per session end
 *                   worker aggregates scores, generates feedback, POSTs to company
 *
 * Retry policy: exponential back-off so transient Claude / webhook failures
 * self-heal without hammering the downstream service.
 */

import { Queue } from 'bullmq'
import config from '@/shared/config/config.ts'

// Shared Redis connection config for BullMQ
// maxRetriesPerRequest: null is required by BullMQ — it manages its own retry logic
export const redisConnection = {
  host:               config.redis.host,
  port:               config.redis.port,
  password:           config.redis.password,
  maxRetriesPerRequest: null,
} as const

// ─── Job payload types ────────────────────────────────────────────────────────

/** One 30-second audio window from a single participant, ready to be scored */
export type ScoringJobData = {
  participantId: string
  sessionId:     string
  transcript:    string
  /** 512-dim pyannote voice embedding — empty array until Python pipeline is wired in */
  embedding:     number[]
  rubricId:      string | null
}

/** Fired once per session end — triggers feedback generation + webhook delivery */
export type WebhookJobData = {
  sessionId:         string
  companyWebhookUrl: string
}

// ─── Queue instances ──────────────────────────────────────────────────────────

export const scoringQueue = new Queue<ScoringJobData>('voiceiq:scoring', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts:          3,
    backoff:           { type: 'exponential', delay: 2_000 },
    removeOnComplete:  100, // keep last 100 completed jobs for debugging
    removeOnFail:       50,
  },
})

export const webhookQueue = new Queue<WebhookJobData>('voiceiq:webhooks', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts:          5,   // webhooks get more retries — company endpoint may be slow
    backoff:           { type: 'exponential', delay: 1_000 },
    removeOnComplete:   50,
    removeOnFail:       20,
  },
})
