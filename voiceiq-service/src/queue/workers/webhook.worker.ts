/**
 * Webhook worker
 *
 * Consumes jobs from the `voiceiq:webhooks` queue.
 * Fired once per session end — this is where the full session is wrapped up.
 *
 * Steps per job:
 *   1. Load all participants for the session
 *   2. For each participant: load all window scores, aggregate them
 *   3. Call Claude via generateFeedback() — coaching report
 *   4. Persist the feedback row to PostgreSQL
 *   5. Mark session as "completed"
 *   6. POST HMAC-signed results to the company's webhook URL
 */

import { Worker, type Job } from 'bullmq'
import { eq } from 'drizzle-orm'
import { db } from '@/core/database/index.ts'
import { scores, feedback, sessions, participants } from '@/core/database/schema/index.ts'
import { generateFeedback } from '@/scoring/engine.ts'
import { aggregateWindows } from '@/scoring/aggregator.ts'
import { deliverWebhook } from '@/webhook/delivery.ts'
import { redisConnection, type WebhookJobData } from '../queues.ts'
import config from '@/shared/config/config.ts'

export function startWebhookWorker() {
  const worker = new Worker<WebhookJobData>(
    'voiceiq:webhooks',
    async (job: Job<WebhookJobData>) => {
      const { sessionId, companyWebhookUrl } = job.data

      // ── 1. Load all participants in this session ───────────────────────────
      const sessionParticipants = await db
        .select()
        .from(participants)
        .where(eq(participants.sessionId, sessionId))

      // ── 2–4. Aggregate scores + generate feedback per participant ─────────
      const results = await Promise.all(
        sessionParticipants.map(async (p) => {
          // Load all 30-second window scores in chronological order
          const windowRows = await db
            .select()
            .from(scores)
            .where(eq(scores.participantId, p.id))
            .orderBy(scores.windowTime)

          // Convert DB rows to the shape aggregateWindows() expects
          const windows = windowRows.map(s => ({
            topic_knowledge:  s.topicKnowledge,
            topic_depth:      s.topicDepth,
            coherence:        s.coherence,
            language_quality: s.languageQuality,
            confidence:       s.confidence,
            originality:      s.originality,
            reasoning:        s.reasoning ?? '',
          }))

          const agg = aggregateWindows(windows)

          // Concatenate all transcripts to give Claude full session context
          const fullTranscript = windowRows.map(s => s.transcript).join('\n\n')

          const coachingReport = await generateFeedback(
            fullTranscript,
            agg.dimensions,
            'Session', // topic — ideally sourced from the rubric context
          )

          // Persist feedback so it's available via GET /v1/session/:id/results
          await db.insert(feedback).values({
            sessionId,
            participantId: p.id,
            finalScores:   agg.dimensions,
            coachingReport,
          })

          return {
            name:              p.name,
            email:             p.email,
            intelligenceScore: agg.intelligenceScore,
            dimensions:        agg.dimensions,
            feedback:          coachingReport,
            fullTranscript,
          }
        }),
      )

      // ── 5. Mark session completed ─────────────────────────────────────────
      await db
        .update(sessions)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(sessions.id, sessionId))

      // ── 6. Deliver signed webhook to company ──────────────────────────────
      await deliverWebhook(companyWebhookUrl, {
        session_id:   sessionId,
        status:       'completed',
        participants: results,
      })
    },
    {
      connection:  redisConnection,
      concurrency: config.voiceiq.webhookConcurrency,
    },
  )

  return worker
}
