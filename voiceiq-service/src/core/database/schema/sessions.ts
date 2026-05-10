/**
 * Session & Participant tables
 *
 * A "session" maps 1-to-1 with a meeting or interview recording.
 * A "participant" is one speaker inside a session.
 *
 * Voice fingerprints (512-dim pgvector) let us re-identify the same person
 * across sessions without them needing to log in.
 */

import { pgTable, uuid, text, timestamp, vector } from 'drizzle-orm/pg-core'
import { companies } from './companies.ts'
import { rubrics } from './companies.ts'

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const sessions = pgTable('voiceiq_sessions', {
  id:        uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),

  /** Optional: link to the rubric used for scoring this session */
  rubricId: uuid('rubric_id').references(() => rubrics.id),

  /** Original meeting URL — used for audit trail and bot re-join logic */
  meetingUrl: text('meeting_url'),

  /** ID of the bot that joined this meeting (set on bot join) */
  botId: text('bot_id'),

  /**
   * Lifecycle states:
   *   active     → meeting is live, audio is flowing
   *   processing → meeting ended, generating feedback
   *   completed  → feedback delivered to company webhook
   *   failed     → something went wrong during processing
   */
  status: text('status').notNull().default('active'),

  /** Company-provided URL to POST results to when the session completes */
  notifyUrl: text('notify_url'),

  createdAt:   timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
})

// ─── Participants ─────────────────────────────────────────────────────────────

/**
 * One row per speaker per session.
 * Created lazily — the first audio chunk from an unknown speaker inserts a row.
 */
export const participants = pgTable('voiceiq_participants', {
  id:        uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id),

  name:  text('name'),
  email: text('email'),

  /**
   * 512-dimensional voice embedding from pyannote-audio.
   * Stored via pgvector — enables cosine-similarity search to recognise
   * the same speaker in future sessions without a login.
   */
  voicePrint: vector('voice_print', { dimensions: 512 }),

  joinedAt: timestamp('joined_at').notNull().defaultNow(),
})
