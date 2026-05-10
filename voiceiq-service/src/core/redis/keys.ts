/**
 * Redis key helpers — VoiceIQ namespaces (aligned with `server` `core/redis/keys`).
 */

export const VOICEIQ_KEYS = {
  liveScore: (participantId: string, sessionId: string) =>
    `voiceiq:live_score:${participantId}:${sessionId}`,

  sessionStatus: (sessionId: string) =>
    `voiceiq:session:${sessionId}:status`,

  botAlive: (botId: string) =>
    `voiceiq:bot:${botId}:alive`,

  rateLimit: (apiKey: string, slot: string) =>
    `voiceiq:rate:${apiKey}:${slot}`,
} as const

/** @deprecated Prefer `VOICEIQ_KEYS` — alias kept for minimal churn in workers/services. */
export const keys = VOICEIQ_KEYS
