/**
 * Per-participant audio buffer
 *
 * Accumulates raw audio chunks until 30 seconds of audio has been collected,
 * then flushes the buffer to the scoring pipeline.
 *
 * Two paths to the scoring queue:
 *
 *   push(chunk)          → buffers raw audio; flushes at 30 s
 *                          → calls stubSTT() (placeholder for Whisper)
 *                          → enqueues scoring job
 *
 *   pushTranscript(win)  → transcript already available (bot ran STT on-device)
 *                          → skips buffering entirely
 *                          → enqueues scoring job immediately
 *
 * STT stub:
 *   The Python Whisper service is not yet wired in. The stub emits
 *   a placeholder transcript so the full pipeline runs end-to-end
 *   and can be tested without a GPU. Replace `flush()` with a real
 *   Whisper HTTP call when the Python service is ready.
 */

import { scoringQueue } from '@/queue/queues.ts'
import config from '@/shared/config/config.ts'
import type { AudioChunk, TranscriptWindow } from './types.ts'

type BufferEntry = {
  chunks:      Buffer[]
  durationSec: number  // estimated seconds accumulated so far
}

export class AudioBufferPool {
  // One buffer per "sessionId:participantId" pair
  private readonly buffers = new Map<string, BufferEntry>()

  // Handlers notified after every flush (used by adapters to forward transcripts)
  private readonly transcriptHandlers: Array<(w: TranscriptWindow) => void> = []

  onTranscript(handler: (w: TranscriptWindow) => void) {
    this.transcriptHandlers.push(handler)
  }

  /** Push a raw audio chunk — flushes automatically at 30 seconds */
  push(chunk: AudioChunk) {
    const key   = bufferKey(chunk.participantId, chunk.sessionId)
    const entry = this.buffers.get(key) ?? { chunks: [], durationSec: 0 }

    entry.chunks.push(chunk.data)
    entry.durationSec += estimateDuration(chunk)

    this.buffers.set(key, entry)

    if (entry.durationSec >= config.voiceiq.windowSeconds) {
      this.flush(chunk.participantId, chunk.sessionId, entry, chunk)
      this.buffers.delete(key)
    }
  }

  /**
   * Push a pre-transcribed window (bot / browser-sdk already ran STT).
   * Bypasses the audio buffer entirely — goes straight to the scoring queue.
   */
  pushTranscript(window: TranscriptWindow) {
    void this.enqueueScoring(window)
    this.emit(window)
  }

  /** Discard buffered audio for a participant that has left the call */
  clear(participantId: string, sessionId: string) {
    this.buffers.delete(bufferKey(participantId, sessionId))
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private flush(
    participantId: string,
    sessionId:     string,
    entry:         BufferEntry,
    lastChunk:     AudioChunk,
  ) {
    const combined = Buffer.concat(entry.chunks)

    // ── STT stub ─────────────────────────────────────────────────────────────
    // Replace this with:  const transcript = await whisperClient.transcribe(combined)
    const transcript =
      `[audio_buffer:${combined.length}B:${lastChunk.format}@${lastChunk.sampleRate}Hz]`

    const window: TranscriptWindow = {
      participantId,
      sessionId,
      transcript,
      embedding: [],   // filled by pyannote once Python pipeline is wired
      rubricId:  null, // scoring worker loads rubric from the session record
    }

    void this.enqueueScoring(window)
    this.emit(window)
  }

  private async enqueueScoring(window: TranscriptWindow) {
    await scoringQueue.add('score-window', {
      participantId: window.participantId,
      sessionId:     window.sessionId,
      transcript:    window.transcript,
      embedding:     window.embedding,
      rubricId:      window.rubricId,
    })
  }

  private emit(window: TranscriptWindow) {
    for (const h of this.transcriptHandlers) h(window)
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bufferKey(participantId: string, sessionId: string): string {
  return `${sessionId}:${participantId}`
}

/**
 * Rough duration estimate without decoding the audio.
 *
 * PCM16LE: bytes / (sampleRate × 2 bytes/sample)
 * Opus:    approximated at 24 kbps → 3 000 bytes/sec
 *          (good enough for triggering the 30-second flush boundary)
 */
function estimateDuration(chunk: AudioChunk): number {
  return chunk.format === 'pcm16le'
    ? chunk.data.length / (chunk.sampleRate * 2)
    : chunk.data.length / 3_000
}
