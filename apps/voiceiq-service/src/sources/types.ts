// ─── Source types ─────────────────────────────────────────────────────────────

/**
 * mediasoup  — circlo-2's own rtc-service (PlainTransport RTP tap)
 * meeting-bot — headless Chrome bot joined to Google Meet / Zoom / Teams
 * browser-sdk — JavaScript MediaRecorder running in the user's browser
 * direct-upload — server-to-server REST (transcript already provided)
 */
export type AudioSourceType = 'mediasoup' | 'meeting-bot' | 'browser-sdk' | 'direct-upload'

export type AudioFormat = 'opus' | 'pcm16le'

// A single raw audio chunk from any source
export type AudioChunk = {
  participantId: string
  sessionId: string
  data: Buffer
  format: AudioFormat
  sampleRate: number
  timestamp: number
}

// Normalised transcript window ready for the scoring queue
export type TranscriptWindow = {
  participantId: string
  sessionId: string
  transcript: string
  // 512-dim voice embedding from pyannote (empty until Python pipeline is wired in)
  embedding: number[]
  rubricId: string | null
}

// Shared adapter interface every source must implement
export interface IAudioAdapter {
  readonly sourceType: AudioSourceType
  readonly sessionId: string
  connect(options: unknown): Promise<void>
  disconnect(): Promise<void>
  onChunk(handler: (chunk: AudioChunk) => void): void
  onTranscript(handler: (window: TranscriptWindow) => void): void
}

// ─── Source attach options per type ──────────────────────────────────────────

export type MediasoupAttachOptions = {
  roomId: string
  // Internal URL of the rtc-service (e.g. http://rtc-service:3001)
  rtcServiceUrl: string
  // IP that rtc-service should send RTP to (this service's IP)
  listenIp: string
}

export type MeetingBotAttachOptions = {
  meetingUrl: string
  platform: 'google_meet' | 'zoom' | 'ms_teams'
}

export type BrowserSdkAttachOptions = {
  // Nothing extra — the browser connects via WebSocket
}

export type AttachOptions =
  | ({ sourceType: 'mediasoup' } & MediasoupAttachOptions)
  | ({ sourceType: 'meeting-bot' } & MeetingBotAttachOptions)
  | ({ sourceType: 'browser-sdk' } & BrowserSdkAttachOptions)
  | { sourceType: 'direct-upload' }
