import { Queue, Worker, type Job } from 'bullmq'
import config from '@/shared/config/config.ts'
import { redis, VOICEIQ_KEYS } from '@/core/redis/index.ts'
import { db } from '@/core/database/index.ts'
import { scores, feedback, sessions, participants, rubrics } from '@/core/database/schema/index.ts'
import { scoreWindow } from '@/scoring/engine.ts'
import { aggregateWindows } from '@/scoring/aggregator.ts'
import { generateFeedback } from '@/scoring/engine.ts'
import { deliverWebhook } from '@/webhook/delivery.ts'
import { eq } from 'drizzle-orm'

const redisConnection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
}

// ─── Job payload types ────────────────────────────────────────────────────────

export type ScoringJobData = {
  participantId: string
  sessionId: string
  transcript: string
  // 512-dim voice embedding from pyannote (stored as array)
  embedding: number[]
  rubricId: string | null
}

export type WebhookJobData = {
  sessionId: string
  companyWebhookUrl: string
}

// ─── Queues ───────────────────────────────────────────────────────────────────

export const scoringQueue = new Queue<ScoringJobData>('voiceiq:scoring', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})

export const webhookQueue = new Queue<WebhookJobData>('voiceiq:webhooks', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 50,
    removeOnFail: 20,
  },
})

// ─── Scoring worker ───────────────────────────────────────────────────────────

export function startScoringWorker() {
  return new Worker<ScoringJobData>(
    'voiceiq:scoring',
    async (job: Job<ScoringJobData>) => {
      const { participantId, sessionId, transcript, rubricId } = job.data

      // Load rubric for scoring context
      const rubric = rubricId
        ? (await db.select().from(rubrics).where(eq(rubrics.id, rubricId)).limit(1))[0]
        : null

      const rubricDef = {
        name: rubric?.name ?? 'General Assessment',
        context: rubric?.context ?? '',
      }

      const windowScores = await scoreWindow(transcript, rubricDef, rubricDef.name)

      // Persist the window score to DB
      await db.insert(scores).values({
        participantId,
        sessionId,
        transcript,
        topicKnowledge: windowScores.topic_knowledge,
        topicDepth:     windowScores.topic_depth,
        coherence:      windowScores.coherence,
        languageQuality:windowScores.language_quality,
        confidence:     windowScores.confidence,
        originality:    windowScores.originality,
        reasoning:      windowScores.reasoning,
      })

      // Push live score to Redis for real-time dashboard / WebSocket
      await redis.set(
        VOICEIQ_KEYS.liveScore(participantId, sessionId),
        JSON.stringify(windowScores),
        'EX',
        300, // 5 minutes TTL
      )
    },
    {
      connection: redisConnection,
      concurrency: config.voiceiq.scoringConcurrency,
    },
  )
}

// ─── Webhook worker ───────────────────────────────────────────────────────────

export function startWebhookWorker() {
  return new Worker<WebhookJobData>(
    'voiceiq:webhooks',
    async (job: Job<WebhookJobData>) => {
      const { sessionId, companyWebhookUrl } = job.data

      // Load all participants and their scores
      const sessionParticipants = await db
        .select()
        .from(participants)
        .where(eq(participants.sessionId, sessionId))

      const results = await Promise.all(
        sessionParticipants.map(async (p) => {
          const windowScores = await db
            .select()
            .from(scores)
            .where(eq(scores.participantId, p.id))
            .orderBy(scores.windowTime)

          const agg = aggregateWindows(
            windowScores.map(s => ({
              topic_knowledge: s.topicKnowledge,
              topic_depth:     s.topicDepth,
              coherence:       s.coherence,
              language_quality:s.languageQuality,
              confidence:      s.confidence,
              originality:     s.originality,
              reasoning:       s.reasoning ?? '',
            })),
          )

          const fullTranscript = windowScores.map(s => s.transcript).join(' ')
          const coachingReport = await generateFeedback(
            fullTranscript,
            agg.dimensions,
            'Session',
          )

          // Persist feedback
          await db.insert(feedback).values({
            sessionId,
            participantId: p.id,
            finalScores: agg.dimensions,
            coachingReport,
          })

          return {
            name:             p.name,
            email:            p.email,
            intelligenceScore: agg.intelligenceScore,
            dimensions:       agg.dimensions,
            feedback:         coachingReport,
            fullTranscript,
          }
        }),
      )

      // Mark session completed
      await db
        .update(sessions)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(sessions.id, sessionId))

      // Deliver webhook to company
      await deliverWebhook(companyWebhookUrl, {
        session_id:   sessionId,
        status:       'completed',
        participants: results,
      })
    },
    {
      connection: redisConnection,
      concurrency: config.voiceiq.webhookConcurrency,
    },
  )
}
