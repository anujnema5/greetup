import { sourceManager } from '@/sources/source-manager.ts'
import type { AttachOptions } from '@/sources/types.ts'
import { sessionRepository } from '../session/repositories/session.repository.ts'
import type { AttachBody } from './sources.schemas.ts'

const sourceTypesWs = new Set(['browser-sdk', 'meeting-bot'])

export const sourcesService = {
  async attach(companyId: string, body: AttachBody) {
    const session = await sessionRepository.findForCompany(body.session_id, companyId)
    if (!session) return { error: 'not_found' as const }
    if (session.status !== 'active') {
      return { error: 'bad_state' as const, status: session.status }
    }

    const opts = buildAttachOptions(body)
    await sourceManager.attach(body.session_id, opts)

    const wsPath = sourceTypesWs.has(body.source_type)
      ? `/v1/sources/ws/${body.session_id}?source=${body.source_type}`
      : null

    return {
      ok:          true as const,
      source_type: body.source_type,
      session_id:  body.session_id,
      ws_path:     wsPath,
      message:     sourceDescription(body.source_type),
    }
  },

  async detach(companyId: string, sessionId: string) {
    const session = await sessionRepository.findForCompany(sessionId, companyId)
    if (!session) return { error: 'not_found' as const }

    await sourceManager.detach(sessionId)
    return { ok: true as const }
  },

  listActive() {
    return { active_sources: sourceManager.list() }
  },

  async statusForSession(companyId: string, sessionId: string) {
    const session = await sessionRepository.findForCompany(sessionId, companyId)
    if (!session) return { error: 'not_found' as const }

    const adapter = sourceManager.get(sessionId)
    return {
      session_id:  sessionId,
      has_source:  !!adapter,
      source_type: adapter?.sourceType ?? null,
    }
  },
}

function buildAttachOptions(body: AttachBody): AttachOptions {
  switch (body.source_type) {
    case 'mediasoup':
      return {
        sourceType:    'mediasoup',
        roomId:        body.room_id,
        rtcServiceUrl: body.rtc_service_url ?? (process.env.RTC_SERVICE_URL ?? 'http://localhost:3001'),
        listenIp:      body.listen_ip       ?? (process.env.VOICEIQ_LISTEN_IP ?? '0.0.0.0'),
      }
    case 'meeting-bot':
      return {
        sourceType: 'meeting-bot',
        meetingUrl: body.meeting_url,
        platform:   body.platform,
      }
    case 'browser-sdk':
      return { sourceType: 'browser-sdk' }
    case 'direct-upload':
      return { sourceType: 'direct-upload' }
  }
}

function sourceDescription(sourceType: AttachBody['source_type']): string {
  switch (sourceType) {
    case 'mediasoup':
      return 'RTP tap created — audio flows automatically from rtc-service'
    case 'meeting-bot':
      return 'Connect bot WebSocket to ws_path to stream audio'
    case 'browser-sdk':
      return 'Open WebSocket to ws_path from the browser SDK'
    case 'direct-upload':
      return 'POST transcripts to POST /v1/session/:id/audio'
  }
}
