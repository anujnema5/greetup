/**
 * Scoring worker
 *
 * Consumes jobs from the `voiceiq:scoring` queue.
 * Each job represents one 30-second audio window from one participant.
 *
 * Steps per job:
 *   1. Load the session's rubric (for context passed to Claude)
 *   2. Call Claude via scoreWindow() — returns 6 dimension scores + reasoning
 *   3. Persist the scores row to PostgreSQL
 *   4. Write the latest score to Redis (TTL 5 min) for the live dashboard
 */

import { Worker, type Job } from 'bullmq'
import { eq } from 'drizzle-orm'
import { db } from '@/core/database/index.ts'
import { scores, rubrics } from '@/core/database/schema/index.ts'
import { redis, VOICEIQ_KEYS } from '@/core/redis/index.ts'
import { scoreWindow } from '@/scoring/engine.ts'
import { redisConnection, type ScoringJobData } from '../queues.ts'
import config from '@/shared/config/config.ts'

export function startScoringWorker() {
  const worker = new Worker<ScoringJobData>(
    'voiceiq:scoring',
    async (job: Job<ScoringJobData>) => {
      const { participantId, sessionId, transcript, rubricId } = job.data

      // ── 1. Load rubric (optional — falls back to generic assessment) ──────
      const rubric = rubricId
        ? (await db.select().from(rubrics).where(eq(rubrics.id, rubricId)).limit(1))[0]
        : null

      const rubricDef = {
        name:    rubric?.name    ?? 'General Assessment',
        context: rubric?.context ?? '',
      }

      // ── 2. Score the transcript with Claude ───────────────────────────────
      const windowScores = await scoreWindow(transcript, rubricDef, rubricDef.name)

      // ── 3. Persist window scores to PostgreSQL ────────────────────────────
      await db.insert(scores).values({
        participantId,
        sessionId,
        transcript,
        topicKnowledge:  windowScores.topic_knowledge,
        topicDepth:      windowScores.topic_depth,
        coherence:       windowScores.coherence,
        languageQuality: windowScores.language_quality,
        confidence:      windowScores.confidence,
        originality:     windowScores.originality,
        reasoning:       windowScores.reasoning,
      })

      // ── 4. Update live score in Redis (for dashboard / WS broadcast) ─────
      await redis.set(
        VOICEIQ_KEYS.liveScore(participantId, sessionId),
        JSON.stringify(windowScores),
        'EX',
        300, // 5-minute TTL — meetings don't run forever
      )
    },
    {
      connection:  redisConnection,
      concurrency: config.voiceiq.scoringConcurrency,
    },
  )

  return worker
}
