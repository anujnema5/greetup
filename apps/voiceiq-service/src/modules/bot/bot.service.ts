import { randomUUID } from 'crypto'
import { webhookQueue } from '@/queue/index.ts'
import { keys, redis } from '@/core/redis/index.ts'
import { rubricRepository } from '../rubric/repositories/rubric.repository.ts'
import { sessionRepository } from '../session/repositories/session.repository.ts'

export const botService = {
  async joinMeeting(
    companyId: string,
    body: { meeting_url: string; rubric?: string; notify_url?: string },
  ) {
    let rubricId: string | null = null
    if (body.rubric) {
      const rubric = await rubricRepository.findById(body.rubric)
      if (rubric?.companyId === companyId) rubricId = rubric.id
    }

    const botId = `bot_${randomUUID().replace(/-/g, '').slice(0, 12)}`

    const session = await sessionRepository.insert({
      companyId,
      rubricId,
      meetingUrl: body.meeting_url,
      botId,
      status:     'active',
      notifyUrl:  body.notify_url ?? null,
    })

    await redis.set(keys.botAlive(botId), '1', 'EX', 30)
    await redis.set(keys.sessionStatus(session.id), 'active', 'EX', 86_400)

    return {
      bot_id:     botId,
      session_id: session.id,
      status:     'joining' as const,
      message:    'Bot will join the meeting within 30 seconds.',
    }
  },

  async heartbeat(botId: string) {
    await redis.set(keys.botAlive(botId), '1', 'EX', 30)
    return { ok: true as const }
  },

  async endMeeting(companyId: string, botId: string) {
    const session = await sessionRepository.findByBotId(botId)
    if (!session || session.companyId !== companyId) {
      return { error: 'not_found' as const }
    }

    await sessionRepository.updateStatus(session.id, 'processing')

    if (session.notifyUrl) {
      await webhookQueue.add('send-results', {
        sessionId:         session.id,
        companyWebhookUrl: session.notifyUrl,
      })
    }

    return { status: 'processing' as const, session_id: session.id }
  },
}
