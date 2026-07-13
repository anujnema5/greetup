/**
 * Direct-upload adapter (no-op)
 *
 * When source_type is "direct-upload" the company is already sending
 * transcripts via REST (POST /v1/session/:id/audio).
 * No persistent connection or streaming is needed — this adapter is a
 * placeholder so the source-manager can track the source type.
 */

import type { IAudioAdapter, AudioChunk, TranscriptWindow } from '../types.ts'

export class DirectUploadAdapter implements IAudioAdapter {
  readonly sourceType = 'direct-upload' as const
  readonly sessionId: string

  constructor(sessionId: string) {
    this.sessionId = sessionId
  }

  async connect()    { /* REST endpoint in session.route.ts handles everything */ }
  async disconnect() { /* nothing to tear down */ }
  onChunk()          { /* no streaming chunks for this source type */ }
  onTranscript()     { /* transcripts arrive via REST, not through the adapter */ }
}
