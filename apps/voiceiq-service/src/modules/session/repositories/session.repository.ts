import { and, eq } from 'drizzle-orm'
import { db } from '@/core/database/index.ts'
import { feedback, participants, scores, sessions } from '@/core/database/schema/index.ts'

export const sessionRepository = {
  insert(values: typeof sessions.$inferInsert) {
    return db
      .insert(sessions)
      .values(values)
      .returning()
      .then(([row]) => row)
  },

  addParticipantNames(sessionId: string, names: string[]) {
    if (!names.length) return Promise.resolve()
    return db.insert(participants).values(names.map(name => ({ sessionId, name })))
  },

  findForCompany(sessionId: string, companyId: string) {
    return db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.companyId, companyId)))
      .limit(1)
      .then(([row]) => row ?? null)
  },

  findByBotId(botId: string) {
    return db
      .select()
      .from(sessions)
      .where(eq(sessions.botId, botId))
      .limit(1)
      .then(([row]) => row ?? null)
  },

  updateStatus(sessionId: string, status: string) {
    return db.update(sessions).set({ status }).where(eq(sessions.id, sessionId))
  },

  listParticipants(sessionId: string) {
    return db.select().from(participants).where(eq(participants.sessionId, sessionId))
  },

  listScoresForParticipant(participantId: string) {
    return db
      .select()
      .from(scores)
      .where(eq(scores.participantId, participantId))
      .orderBy(scores.windowTime)
  },

  findFeedbackForParticipant(participantId: string) {
    return db
      .select()
      .from(feedback)
      .where(eq(feedback.participantId, participantId))
      .limit(1)
      .then(([row]) => row ?? null)
  },

  async upsertParticipant(
    sessionId: string,
    body: { participant_name?: string; participant_email?: string },
  ): Promise<string> {
    if (body.participant_email) {
      const [existing] = await db
        .select()
        .from(participants)
        .where(
          and(
            eq(participants.sessionId, sessionId),
            eq(participants.email, body.participant_email),
          ),
        )
        .limit(1)

      if (existing) return existing.id
    }

    const [p] = await db
      .insert(participants)
      .values({
        sessionId,
        name:  body.participant_name  ?? null,
        email: body.participant_email ?? null,
      })
      .returning()

    return p.id
  },
}
