/**
 * WebSocket audio adapter  (browser-sdk + meeting-bot)
 *
 * Both the browser SDK (MediaRecorder) and the Puppeteer meeting bot
 * connect here to stream audio in real-time.
 *
 * Connection URL:
 *   ws://<host>/v1/sources/ws/<sessionId>?source=browser-sdk&token=<api_key>
 *   ws://<host>/v1/sources/ws/<sessionId>?source=meeting-bot&token=<api_key>
 *
 * ─── Client → Server message protocol ────────────────────────────────────────
 *
 *   { type: "identify", participant_name: string, participant_email?: string }
 *     → Set the display name for this client's participant row.
 *       Call once after connecting. Until called, name shows as "Unknown".
 *
 *   { type: "audio", data: "<base64>", format: "opus"|"pcm16le", sample_rate: number }
 *     → Send a raw audio chunk. Accumulated in the 30-second buffer.
 *       Triggers scoring when the window fills.
 *
 *   { type: "transcript", text: string }
 *     → Send a pre-transcribed window (e.g., bot ran on-device STT).
 *       Skips the audio buffer and goes straight to the scoring queue.
 *       Useful for lower latency if the client has a local Whisper model.
 *
 *   { type: "end" }
 *     → Client signals it has finished sending. Server closes the connection.
 *
 * ─── Server → Client message protocol ────────────────────────────────────────
 *
 *   { type: "connected", participant_id: string }
 *     → Sent immediately on connect and again after "identify".
 *
 *   { type: "error", message: string }
 *     → Sent when a message cannot be parsed.
 *
 * One adapter instance handles ALL clients for a given session.
 * Each WebSocket connection represents one participant (one browser tab / one bot).
 */

import { WebSocketServer } from 'ws'
import type { WebSocket, RawData } from 'ws'
import type { IncomingMessage } from 'http'
import type { IAudioAdapter, AudioChunk, TranscriptWindow, AudioSourceType } from '../types.ts'
import { AudioBufferPool } from '../audio-buffer.ts'

type WsMessage =
  | { type: 'identify';   participant_name: string; participant_email?: string }
  | { type: 'audio';      data: string; format: 'opus' | 'pcm16le'; sample_rate: number }
  | { type: 'transcript'; text: string; participant_id?: string }
  | { type: 'end' }

type ParticipantMeta = {
  id:   string
  name: string
}

export class WebSocketAdapter implements IAudioAdapter {
  readonly sourceType: AudioSourceType
  readonly sessionId:  string

  private readonly wss: WebSocketServer
  private readonly bufferPool = new AudioBufferPool()

  private readonly participants      = new Map<WebSocket, ParticipantMeta>()
  private readonly chunkHandlers:      Array<(c: AudioChunk) => void>       = []
  private readonly transcriptHandlers: Array<(w: TranscriptWindow) => void> = []

  // Bound so we can remove the listener cleanly on disconnect()
  private readonly boundHandleConnection: (ws: WebSocket, req: IncomingMessage) => void

  constructor(
    sessionId:  string,
    sourceType: 'meeting-bot' | 'browser-sdk',
    wss:        WebSocketServer,
  ) {
    this.sessionId  = sessionId
    this.sourceType = sourceType
    this.wss        = wss

    this.bufferPool.onTranscript(w => {
      for (const h of this.transcriptHandlers) h(w)
    })

    this.boundHandleConnection = this.handleConnection.bind(this)
  }

  onChunk(handler: (c: AudioChunk) => void)           { this.chunkHandlers.push(handler)      }
  onTranscript(handler: (w: TranscriptWindow) => void) { this.transcriptHandlers.push(handler) }

  async connect(): Promise<void> {
    this.wss.on('connection', this.boundHandleConnection)
  }

  async disconnect(): Promise<void> {
    this.wss.off('connection', this.boundHandleConnection)
    for (const ws of this.participants.keys()) {
      ws.close(1_001, 'Session ended')
    }
    this.participants.clear()
  }

  // ─── Connection handling ───────────────────────────────────────────────────

  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    const url         = new URL(req.url ?? '/', 'ws://localhost')
    const pathSegments = url.pathname.split('/')
    const sessionIdFromPath = pathSegments[pathSegments.length - 1]

    // Ignore connections that belong to a different session or source type
    if (sessionIdFromPath !== this.sessionId) return
    const sourceParam = url.searchParams.get('source') ?? ''
    if (sourceParam && sourceParam !== this.sourceType) return

    // Assign a temporary ID; replaced by stable DB ID once "identify" is received
    const tempId: ParticipantMeta = {
      id:   `ws_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: 'Unknown',
    }
    this.participants.set(ws, tempId)

    ws.send(JSON.stringify({ type: 'connected', participant_id: tempId.id }))

    ws.on('message', (raw: RawData) => this.handleMessage(ws, raw.toString()))
    ws.on('close',   ()    => this.onClose(ws))
    ws.on('error',   ()    => this.participants.delete(ws))
  }

  private handleMessage(ws: WebSocket, raw: string) {
    let msg: WsMessage
    try {
      msg = JSON.parse(raw)
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'invalid_json' }))
      return
    }

    const meta = this.participants.get(ws)
    if (!meta) return

    switch (msg.type) {
      case 'identify': {
        meta.name = msg.participant_name
        this.participants.set(ws, meta)
        ws.send(JSON.stringify({ type: 'connected', participant_id: meta.id }))
        break
      }

      case 'audio': {
        const chunk: AudioChunk = {
          participantId: meta.id,
          sessionId:     this.sessionId,
          data:          Buffer.from(msg.data, 'base64'),
          format:        msg.format,
          sampleRate:    msg.sample_rate ?? 48_000,
          timestamp:     Date.now(),
        }
        for (const h of this.chunkHandlers) h(chunk)
        this.bufferPool.push(chunk)
        break
      }

      case 'transcript': {
        // Pre-transcribed path — client did its own STT; skip the audio buffer
        this.bufferPool.pushTranscript({
          participantId: msg.participant_id ?? meta.id,
          sessionId:     this.sessionId,
          transcript:    msg.text,
          embedding:     [],
          rubricId:      null,
        })
        break
      }

      case 'end': {
        ws.close(1_000, 'Session ended by client')
        break
      }
    }
  }

  private onClose(ws: WebSocket) {
    const meta = this.participants.get(ws)
    if (meta) this.bufferPool.clear(meta.id, this.sessionId)
    this.participants.delete(ws)
  }
}
