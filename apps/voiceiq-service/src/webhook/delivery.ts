import { createHmac } from 'crypto'
import config from '@/shared/config/config.ts'

// Signs the payload with HMAC-SHA256 so companies can verify it came from VoiceIQ
function signPayload(body: string): string {
  return createHmac('sha256', config.voiceiq.webhookSecret)
    .update(body)
    .digest('hex')
}

export async function deliverWebhook(url: string, payload: unknown): Promise<void> {
  const body = JSON.stringify(payload)
  const signature = signPayload(body)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-VoiceIQ-Signature': `sha256=${signature}`,
      'User-Agent': 'VoiceIQ-Webhook/1.0',
    },
    body,
    signal: AbortSignal.timeout(10_000), // 10s timeout
  })

  if (!response.ok) {
    throw new Error(
      `Webhook delivery failed: ${url} responded with ${response.status}`,
    )
  }
}
