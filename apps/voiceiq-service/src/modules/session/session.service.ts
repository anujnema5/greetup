import { aggregateWindows } from '@/scoring/aggregator.ts'
import { scoringQueue, webhookQueue } from '@/queue/index.ts'
import { keys, redis } from '@/core/redis/index.ts'
import { sessionRepository } from './repositories/session.repository.ts'

export const sessionService = {
  async createSession(
    companyId: string,
    input: {
      rubric?: string
      participants?: string[]
      notify_url?: string
    },
  ) {
    const session = await sessionRepository.insert({
      companyId,
      rubricId:  input.rubric ?? null,
      status:    'active',
      notifyUrl: input.notify_url ?? null,
    })

    if (input.participants?.length) {
      await sessionRepository.addParticipantNames(session.id, input.participants)
    }

    await redis.set(keys.sessionStatus(session.id), 'active', 'EX', 86_400)

    return { session_id: session.id, status: 'active' as const }
  },

  async submitAudioWindow(
    companyId: string,
    sessionId: string,
    body: {
      transcript: string
      embedding?: number[]
      participant_name?: string
      participant_email?: string
    },
  ) {
    const session = await sessionRepository.findForCompany(sessionId, companyId)
    if (!session) return { error: 'not_found' as const }
    if (session.status !== 'active') {
      return { error: 'bad_state' as const, status: session.status }
    }

    const participantId = await sessionRepository.upsertParticipant(sessionId, body)

    await scoringQueue.add('score-window', {
      participantId,
      sessionId,
      transcript: body.transcript,
      embedding:  body.embedding ?? [],
      rubricId:   session.rubricId,
    })

    return { queued: true as const, participant_id: participantId }
  },

  async endSession(companyId: string, sessionId: string) {
    const session = await sessionRepository.findForCompany(sessionId, companyId)
    if (!session) return { error: 'not_found' as const }

    await sessionRepository.updateStatus(sessionId, 'processing')

    if (session.notifyUrl) {
      await webhookQueue.add('send-results', {
        sessionId,
        companyWebhookUrl: session.notifyUrl,
      })
    }

    return { status: 'processing' as const, session_id: sessionId }
  },

  async getResults(companyId: string, sessionId: string) {
    const session = await sessionRepository.findForCompany(sessionId, companyId)
    if (!session) return { error: 'not_found' as const }

    const sessionParticipants = await sessionRepository.listParticipants(sessionId)

    const participantResults = await Promise.all(
      sessionParticipants.map(async p => {
        const windowRows = await sessionRepository.listScoresForParticipant(p.id)

        const agg = aggregateWindows(
          windowRows.map(s => ({
            topic_knowledge:  s.topicKnowledge,
            topic_depth:      s.topicDepth,
            coherence:        s.coherence,
            language_quality: s.languageQuality,
            confidence:       s.confidence,
            originality:      s.originality,
            reasoning:        s.reasoning ?? '',
          })),
        )

        const coachingReport = await sessionRepository.findFeedbackForParticipant(p.id)

        return {
          participant_id:    p.id,
          name:              p.name,
          email:             p.email,
          intelligence_score: agg.intelligenceScore,
          dimensions:        agg.dimensions,
          feedback:          coachingReport?.coachingReport ?? null,
        }
      }),
    )

    return {
      session_id:   session.id,
      status:       session.status,
      participants: participantResults,
    }
  },

  async getLiveScores(companyId: string, sessionId: string) {
    const session = await sessionRepository.findForCompany(sessionId, companyId)
    if (!session) return { error: 'not_found' as const }

    const sessionParticipants = await sessionRepository.listParticipants(sessionId)

    const liveScores = await Promise.all(
      sessionParticipants.map(async p => ({
        participant_id: p.id,
        name:           p.name,
        scores: await redis
          .get(keys.liveScore(p.id, sessionId))
          .then(raw => (raw ? JSON.parse(raw) : null)),
      })),
    )

    return { session_id: sessionId, live: liveScores }
  },
}
