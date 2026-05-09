/**
 * Mic-only dominant speaker: mediasoup AudioLevelObserver → coalesced `dominantSpeaker` Socket.IO payloads.
 * Screen/tab audio producers are excluded via {@link isMicProducerForDominantUI}.
 */
import type { types as MediasoupTypes } from "mediasoup";
import type { LocalRoom } from "@/rooms/room-registry";
import { logger } from "@/core/logger";
import { mediaSourceFromProducerAppData } from "@/peers/media-source.util";

// ---------------------------------------------------------------------------
// Public contract (event name, payload, helpers for peer.service + clients)
// ---------------------------------------------------------------------------

export const DOMINANT_SPEAKER_SOCKET_EVENT = "dominantSpeaker" as const;

export type DominantSpeakerSocketPayload = { peerId: string | null };

/**
 * Hook supplied by {@link PeerSessionService}: “tell every client in this room the new highlight peer”.
 * Implementation is usually Socket.IO `emit(DOMINANT_SPEAKER_SOCKET_EVENT, payload)`.
 */
export type DominantSpeakerRoomNotifier = (
  roomId: string,
  payload: DominantSpeakerSocketPayload,
) => void;

/** True for microphone audio; false for display-capture audio (screen share). */
export function isMicProducerForDominantUI(producer: MediasoupTypes.Producer): boolean {
  if (producer.kind !== "audio") return false;
  return mediaSourceFromProducerAppData(producer.appData) !== "screen";
}

// ---------------------------------------------------------------------------
// Internal: AudioLevelObserver volume samples
// ---------------------------------------------------------------------------

type VolumeSample = { producer: MediasoupTypes.Producer; volume: number };

function producerIdOfLoudestVolume(volumes: VolumeSample[]): string | null {
  if (volumes.length === 0) return null;
  let top = volumes[0]!;
  for (let i = 1; i < volumes.length; i++) {
    const v = volumes[i]!;
    if (v.volume > top.volume) top = v;
  }
  return top.producer.id;
}

// ---------------------------------------------------------------------------
// Coordinator: observer wiring + de-duplicated broadcasts
// ---------------------------------------------------------------------------

/**
 * Watches mic levels and decides **who** should be highlighted.
 *
 * 1. mediasoup `AudioLevelObserver` fires (`volumes` / `silence`).
 * 2. We map loudest producer → `peerId` (mic only; screen audio excluded earlier).
 * 3. If that `peerId` changed vs last time, we call `notifyRoom` (wired to Socket.IO in peer service).
 */
export class DominantSpeakerCoordinator {
  private readonly lastPeerIdByRoom = new Map<string, string | null>();

  constructor(private readonly notifyRoom: DominantSpeakerRoomNotifier) {}

  // --- mediasoup: attach observer + register mic producers ---

  attachLevelObserver(
    room: LocalRoom,
    roomId: string,
    resolvePeerId: (producerId: string) => string | null,
  ): void {
    if (room.dominantSpeakerListenerAttached) return;
    room.dominantSpeakerListenerAttached = true;

    room.audioLevelObserver.on("volumes", (volumes: VolumeSample[]) => {
      if (volumes.length === 0) {
        this.broadcastIfChanged(roomId, null);
        return;
      }
      const producerId = producerIdOfLoudestVolume(volumes);
      if (!producerId) return;
      const peerId = resolvePeerId(producerId);
      if (!peerId) return;
      this.broadcastIfChanged(roomId, peerId);
    });

    room.audioLevelObserver.on("silence", () => {
      this.broadcastIfChanged(roomId, null);
    });
  }

  async addMicProducer(room: LocalRoom, producerId: string): Promise<void> {
    try {
      await room.audioLevelObserver.addProducer({ producerId });
    } catch (err) {
      logger.warn("AudioLevelObserver addProducer failed", { roomId: room.roomId, producerId, err });
    }
  }

  async removeMicProducer(room: LocalRoom, producerId: string): Promise<void> {
    try {
      await room.audioLevelObserver.removeProducer({ producerId });
    } catch {
      /* producer may already be closed */
    }
  }

  // --- Coalesced Socket payload (only when peerId changes) ---

  broadcastIfChanged(roomId: string, peerId: string | null): void {
    const prev = this.lastPeerIdByRoom.get(roomId) ?? null;
    if (prev === peerId) return;
    this.lastPeerIdByRoom.set(roomId, peerId);
    this.notifyRoom(roomId, { peerId });
  }

  /** If this user’s tile was highlighted, clear immediately (e.g. mic muted). */
  clearHighlightIfUser(roomId: string, userId: string): void {
    if (this.lastPeerIdByRoom.get(roomId) === userId) {
      this.broadcastIfChanged(roomId, null);
    }
  }

  // --- Bookkeeping ---

  /** Current highlight target (for mute/leave edge cases). */
  currentHighlightedPeerId(roomId: string): string | null {
    return this.lastPeerIdByRoom.get(roomId) ?? null;
  }

  forgetRoom(roomId: string): void {
    this.lastPeerIdByRoom.delete(roomId);
  }
}
