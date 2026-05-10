/**
 * Source manager
 *
 * Singleton registry that tracks which audio adapter is active for each session.
 * One session → one adapter. Attaching a new source to a session that already
 * has one will tear down the old adapter first.
 *
 * Supported source types and their adapters:
 *
 *   mediasoup    → MediasoupAdapter  (UDP RTP from rtc-service PlainTransport)
 *   meeting-bot  → WebSocketAdapter  (bot streams audio via WebSocket)
 *   browser-sdk  → WebSocketAdapter  (browser streams via MediaRecorder + WebSocket)
 *   direct-upload→ DirectUploadAdapter (no-op; REST route handles everything)
 */

import { WebSocketServer } from 'ws'
import type { IAudioAdapter, AttachOptions } from './types.ts'
import { MediasoupAdapter }    from './adapters/mediasoup.adapter.ts'
import { WebSocketAdapter }    from './adapters/websocket.adapter.ts'
import { DirectUploadAdapter } from './adapters/direct-upload.adapter.ts'

class SourceManager {
  // sessionId → active adapter
  private readonly adapters = new Map<string, IAudioAdapter>()

  // Shared WebSocket server — injected once at startup via init()
  private wss: WebSocketServer | null = null

  /**
   * Must be called once during app bootstrap before any WebSocket-based
   * source can be attached.
   */
  init(wss: WebSocketServer) {
    this.wss = wss
  }

  /**
   * Attach an audio source to a session.
   * If the session already has a source, it is torn down first.
   * Returns the newly created adapter.
   */
  async attach(sessionId: string, opts: AttachOptions): Promise<IAudioAdapter> {
    await this.detach(sessionId)

    const adapter = await this.createAdapter(sessionId, opts)
    this.adapters.set(sessionId, adapter)
    return adapter
  }

  /**
   * Disconnect and remove the adapter for a session.
   * Safe to call even if no adapter is active.
   */
  async detach(sessionId: string): Promise<void> {
    const existing = this.adapters.get(sessionId)
    if (!existing) return
    await existing.disconnect()
    this.adapters.delete(sessionId)
  }

  /** Retrieve the active adapter for a session (undefined if none). */
  get(sessionId: string): IAudioAdapter | undefined {
    return this.adapters.get(sessionId)
  }

  /** List all active sources — useful for the /v1/sources/status endpoint. */
  list(): Array<{ sessionId: string; sourceType: string }> {
    return Array.from(this.adapters.entries()).map(([sid, a]) => ({
      sessionId:  sid,
      sourceType: a.sourceType,
    }))
  }

  /** Gracefully disconnect all active adapters (called on SIGTERM). */
  async shutdown(): Promise<void> {
    await Promise.all(
      Array.from(this.adapters.keys()).map(sid => this.detach(sid)),
    )
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private async createAdapter(sessionId: string, opts: AttachOptions): Promise<IAudioAdapter> {
    switch (opts.sourceType) {
      case 'mediasoup': {
        const adapter = new MediasoupAdapter(sessionId)
        await adapter.connect(opts)
        return adapter
      }

      case 'meeting-bot':
      case 'browser-sdk': {
        if (!this.wss) {
          throw new Error('WebSocketServer not initialised — call sourceManager.init(wss) first')
        }
        const adapter = new WebSocketAdapter(sessionId, opts.sourceType, this.wss)
        await adapter.connect()
        return adapter
      }

      case 'direct-upload': {
        const adapter = new DirectUploadAdapter(sessionId)
        await adapter.connect()
        return adapter
      }

      default:
        throw new Error(`Unknown source type: ${(opts as { sourceType: string }).sourceType}`)
    }
  }
}

// Export a single shared instance
export const sourceManager = new SourceManager()
