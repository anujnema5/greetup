/**
 * Score & Feedback tables
 *
 * Scores are written every 30 seconds per participant (one row per window).
 * Feedback is written once at session end — it's the aggregated coaching report.
 *
 * Six scoring dimensions (all 0–100):
 *   topic_knowledge  — correctness and depth of domain knowledge
 *   topic_depth      — ability to explain the "why", not just surface facts
 *   coherence        — logical flow and structure of speech
 *   language_quality — vocabulary, grammar, and clarity
 *   confidence       — directness, absence of filler words and hesitation
 *   originality      — novel perspectives vs. reciting common knowledge
 */

import { pgTable, uuid, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { sessions } from './sessions.ts'
import { participants } from './sessions.ts'

// ─── Per-window scores ────────────────────────────────────────────────────────

export const scores = pgTable('voiceiq_scores', {
  id:            uuid('id').primaryKey().defaultRandom(),
  participantId: uuid('participant_id').notNull().references(() => participants.id),
  sessionId:     uuid('session_id').notNull().references(() => sessions.id),

  /** Timestamp of the START of this 30-second audio window */
  windowTime: timestamp('window_time').notNull().defaultNow(),

  /** The raw transcript for this window (used for audit + re-scoring) */
  transcript: text('transcript').notNull(),

  // ── Six dimension scores ──────────────────────────────────────────────────
  topicKnowledge:  integer('topic_knowledge').notNull(),
  topicDepth:      integer('topic_depth').notNull(),
  coherence:       integer('coherence').notNull(),
  languageQuality: integer('language_quality').notNull(),
  confidence:      integer('confidence').notNull(),
  originality:     integer('originality').notNull(),

  /** One-sentence explanation from Claude for why it gave these scores */
  reasoning: text('reasoning'),
})

// ─── End-of-session coaching feedback ────────────────────────────────────────

/**
 * One coaching report per participant per session.
 * Generated after all windows are scored and the session ends.
 *
 * coachingReport JSON shape:
 *   { strength, improvements: [{ area, observation, technique, drill }], summary }
 */
export const feedback = pgTable('voiceiq_feedback', {
  id:            uuid('id').primaryKey().defaultRandom(),
  sessionId:     uuid('session_id').notNull().references(() => sessions.id),
  participantId: uuid('participant_id').references(() => participants.id),

  /** Recency-weighted aggregate of all window scores: { topic_knowledge, topic_depth, … } */
  finalScores: jsonb('final_scores').notNull(),

  /** Full coaching report from generateFeedback() */
  coachingReport: jsonb('coaching_report').notNull(),

  createdAt: timestamp('created_at').notNull().defaultNow(),
})
