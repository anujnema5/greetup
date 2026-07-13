/**
 * Company & Rubric tables
 *
 * A "company" is any B2B customer that has an API key.
 * A "rubric" is a company-defined scoring template — they decide
 * what dimensions matter and how much each one is weighted.
 */

import { pgTable, uuid, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core'

// ─── Companies ────────────────────────────────────────────────────────────────

export const companies = pgTable('voiceiq_companies', {
  id:   uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),

  /** Determines feature access and session quota: starter | growth | scale | enterprise */
  plan: text('plan').notNull().default('starter'),

  /** Unique per company; passed as `x-api-key` or `Authorization: Bearer` header */
  apiKey: text('api_key').notNull().unique(),

  /** Max sessions allowed per billing month */
  sessionsPerMonth: integer('sessions_per_month').notNull().default(50),

  /** Rate-limit ceiling: requests per hour across all API calls */
  hourlyRateLimit: integer('hourly_rate_limit').notNull().default(100),

  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ─── Rubrics ──────────────────────────────────────────────────────────────────

/**
 * A rubric lets a company define WHAT "good" looks like for their context.
 * e.g. a technical interview rubric weights topic_knowledge heavily,
 * while a sales-call rubric might prioritise language_quality and confidence.
 */
export const rubrics = pgTable('voiceiq_rubrics', {
  id:        uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  name:      text('name').notNull(),

  /**
   * JSON object keyed by dimension name, value is weight (0–1).
   * Must sum to 1.0.  Example: { "topic_knowledge": 0.30, "topic_depth": 0.25, … }
   */
  dimensions: jsonb('dimensions').notNull(),

  /**
   * Free-text context injected into the Claude scoring prompt.
   * Lets companies specialise the AI without touching the prompt template.
   * e.g. "Focus on distributed systems. We use Node.js and PostgreSQL."
   */
  context: text('context').notNull().default(''),

  /** Participants scoring below this threshold are flagged for auto-reject */
  autoRejectBelow: integer('auto_reject_below').default(0),

  createdAt: timestamp('created_at').notNull().defaultNow(),
})
