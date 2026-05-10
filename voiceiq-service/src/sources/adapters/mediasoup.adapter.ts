/**
 * MediaSoup audio adapter
 *
 * Taps into a circlo-2 room's audio by creating a mediasoup PlainTransport
 * on the rtc-service side. Audio flows as raw RTP UDP packets:
 *
 *   rtc-service room                voiceiq-service
 *   ─────────────────               ─────────────────────
 *   Peer mic producer               UDP socket (this file)
 *        │                                  ▲
 *        ▼                                  │
 *   PlainTransport ──── RTP/UDP ────────────┘
 *   (created via
 *    /internal/voiceiq/tap)
 *
 * Each RTP packet carries an SSRC that identifies which participant sent it.
 * The rtc-service returns a SSRC→participantId map when the tap is created,
 * which we store here and use to route packets to the correct audio buffer.
 *
 * When new peers join after the tap is already running, call addConsumer()
 * with their new SSRC so their audio is also captured.
 */

import { createSocket, type Socket as UDPSocket } from 'dgram'
import type { IAudioAdapter, AudioChunk, TranscriptWindow, MediasoupAttachOptions } from '../types.ts'
import { parseRTP } from '../rtp-parser.ts'
import { AudioBufferPool } from '../audio-buffer.ts'

// Shape of the response from POST /internal/voiceiq/tap on rtc-service
type TapConsumer = {
  consumerId:    string
  ssrc:          number   // RTP SSRC → identifies this participant's packets
  participantId: string   // VoiceIQ participant UUID
  peerId:        string   // userId inside the rtc-service room
}

type TapResponse =
  | {
      ok:             true
      tapId:          string
      rtcServiceIp:   string
      rtcServicePort: number
      consumers:      TapConsumer[]
    }
  | { ok: false; error: string }

export class MediasoupAdapter implements IAudioAdapter {
  readonly sourceType = 'mediasoup' as const
  readonly sessionId:  string

  private udpSocket:          UDPSocket | null = null
  private tapId:              string | null    = null
  private options!:           MediasoupAttachOptions

  // SSRC → participantId — populated from the tap response and updated on addConsumer()
  private readonly ssrcMap = new Map<number, string>()

  private readonly chunkHandlers:      Array<(c: AudioChunk) => void>       = []
  private readonly transcriptHandlers: Array<(w: TranscriptWindow) => void> = []
  private readonly bufferPool = new AudioBufferPool()

  constructor(sessionId: string) {
    this.sessionId = sessionId
    this.bufferPool.onTranscript(w => {
      for (const h of this.transcriptHandlers) h(w)
    })
  }

  onChunk(handler: (c: AudioChunk) => void)          { this.chunkHandlers.push(handler)      }
  onTranscript(handler: (w: TranscriptWindow) => void) { this.transcriptHandlers.push(handler) }

  async connect(options: MediasoupAttachOptions): Promise<void> {
    this.options = options

    // ── 1. Bind UDP socket — OS assigns a free port ────────────────────────
    const udp = createSocket('udp4')
    await new Promise<void>((resolve, reject) => {
      udp.once('error', reject)
      udp.bind(0, options.listenIp, resolve)
    })
    const listenPort = (udp.address() as { port: number }).port
    this.udpSocket = udp

    // ── 2. Ask rtc-service to open a PlainTransport tap ────────────────────
    const tapRes = await this.requestTap(options, listenPort)
    if (!tapRes.ok) {
      udp.close()
      throw new Error(`rtc-service tap failed: ${tapRes.error}`)
    }

    this.tapId = tapRes.tapId

    // ── 3. Build SSRC → participantId lookup table ─────────────────────────
    for (const c of tapRes.consumers) {
      this.ssrcMap.set(c.ssrc, c.participantId)
    }

    // ── 4. Start receiving RTP packets ─────────────────────────────────────
    udp.on('message', (msg) => {
      const rtp = parseRTP(msg)
      if (!rtp) return

      const participantId = this.ssrcMap.get(rtp.ssrc)
      if (!participantId) return  // unknown sender; happens briefly on late join

      const chunk: AudioChunk = {
        participantId,
        sessionId:  this.sessionId,
        data:       rtp.payload,
        format:     'opus',   // rtc-service encodes all audio as Opus 48 kHz stereo
        sampleRate: 48_000,
        timestamp:  Date.now(),
      }

      for (const h of this.chunkHandlers) h(chunk)
      this.bufferPool.push(chunk)
    })
  }

  /**
   * Register a new participant who joined after the tap was created.
   * The rtc-service publishes a Redis event with the new SSRC; the caller
   * (source-manager or a Redis subscriber) should call this.
   */
  async addConsumer(participantId: string, ssrc: number): Promise<void> {
    this.ssrcMap.set(ssrc, participantId)
  }

  async disconnect(): Promise<void> {
    // Tell rtc-service to close the PlainTransport (best effort)
    if (this.tapId) {
      await this.releaseTap().catch(() => {})
    }
    this.udpSocket?.close()
    this.udpSocket = null
    this.ssrcMap.clear()
  }

  // ─── Private — rtc-service internal API calls ──────────────────────────────

  private async requestTap(opts: MediasoupAttachOptions, listenPort: number): Promise<TapResponse> {
    const res = await fetch(`${opts.rtcServiceUrl}/internal/voiceiq/tap`, {
      method: 'POST',
      headers: {
        'Content-Type':       'application/json',
        'x-internal-api-key': process.env.INTERNAL_API_KEY ?? '',
      },
      body: JSON.stringify({
        roomId:      opts.roomId,
        voiceiqIp:   opts.listenIp,
        voiceiqPort: listenPort,
        sessionId:   this.sessionId,
      }),
    })
    return res.json() as Promise<TapResponse>
  }

  private async releaseTap(): Promise<void> {
    await fetch(`${this.options.rtcServiceUrl}/internal/voiceiq/tap/${this.tapId}`, {
      method:  'DELETE',
      headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY ?? '' },
    })
  }
}
