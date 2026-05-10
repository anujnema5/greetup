/**
 * Schema barrel + Drizzle relations
 *
 * Import from `@/core/database/schema` so relations stay registered.
 */

export { companies, rubrics } from './companies.ts'
export { sessions, participants } from './sessions.ts'
export { scores, feedback } from './scores.ts'

import { relations } from 'drizzle-orm'
import { companies, rubrics } from './companies.ts'
import { sessions, participants } from './sessions.ts'
import { scores, feedback } from './scores.ts'

// ─── Relations ────────────────────────────────────────────────────────────────

export const companiesRelations = relations(companies, ({ many }) => ({
  rubrics:  many(rubrics),
  sessions: many(sessions),
}))

export const rubricsRelations = relations(rubrics, ({ one, many }) => ({
  company:  one(companies, { fields: [rubrics.companyId], references: [companies.id] }),
  sessions: many(sessions),
}))

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  company:      one(companies,  { fields: [sessions.companyId], references: [companies.id] }),
  rubric:       one(rubrics,    { fields: [sessions.rubricId],  references: [rubrics.id]   }),
  participants: many(participants),
  scores:       many(scores),
  feedback:     many(feedback),
}))

export const participantsRelations = relations(participants, ({ one, many }) => ({
  session: one(sessions, { fields: [participants.sessionId], references: [sessions.id] }),
  scores:  many(scores),
}))

export const scoresRelations = relations(scores, ({ one }) => ({
  participant: one(participants, { fields: [scores.participantId], references: [participants.id] }),
  session:     one(sessions,    { fields: [scores.sessionId],     references: [sessions.id]     }),
}))

export const feedbackRelations = relations(feedback, ({ one }) => ({
  session:     one(sessions,     { fields: [feedback.sessionId],     references: [sessions.id]     }),
  participant: one(participants,  { fields: [feedback.participantId], references: [participants.id] }),
}))
