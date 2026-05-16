import type { types as MediasoupTypes } from "mediasoup";
import type { LocalRoom } from "@/modules/rtc/room/room-registry";
import { logger } from "@/core/logging";
import { mediaSourceFromProducerAppData } from "@/modules/rtc/peer/media-source";

export const DOMINANT_SPEAKER_SOCKET_EVENT = "dominantSpeaker" as const;

export type DominantSpeakerSocketPayload = {
  peerId: string | null;
  /** Cumulative mic-dominant milliseconds per peer (includes the active segment). */
  speakingMsByPeer: Record<string, number>;
};

export type DominantSpeakerRoomNotifier = (
  roomId: string,
  payload: DominantSpeakerSocketPayload,
) => void;

export function isMicProducerForDominantUI(producer: MediasoupTypes.Producer): boolean {
  if (producer.kind !== "audio") return false;
  return mediaSourceFromProducerAppData(producer.appData) !== "screen";
}

type VolumeSample = { producer: MediasoupTypes.Producer; volume: number };

type RoomSpeakingState = {
  currentPeerId: string | null;
  currentSinceMs: number | null;
  speakingMsByPeer: Map<string, number>;
};

function producerIdOfLoudestVolume(volumes: VolumeSample[]): string | null {
  if (volumes.length === 0) return null;
  let top = volumes[0]!;
  for (let i = 1; i < volumes.length; i++) {
    const v = volumes[i]!;
    if (v.volume > top.volume) top = v;
  }
  return top.producer.id;
}

function speakingMsSnapshot(state: RoomSpeakingState, nowMs: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [peerId, ms] of state.speakingMsByPeer) {
    out[peerId] = ms;
  }
  if (state.currentPeerId && state.currentSinceMs != null) {
    const peerId = state.currentPeerId;
    const extra = Math.max(0, nowMs - state.currentSinceMs);
    out[peerId] = (out[peerId] ?? 0) + extra;
  }
  return out;
}

export class DominantSpeakerCoordinator {
  private readonly lastPeerIdByRoom = new Map<string, string | null>();
  private readonly speakingByRoom = new Map<string, RoomSpeakingState>();

  constructor(private readonly notifyRoom: DominantSpeakerRoomNotifier) {}

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
      /* ignore */
    }
  }

  broadcastIfChanged(roomId: string, peerId: string | null): void {
    const prev = this.lastPeerIdByRoom.get(roomId) ?? null;
    if (prev === peerId) return;

    this.flushSpeakingSegment(roomId);
    const state = this.roomSpeakingState(roomId);
    state.currentPeerId = peerId;
    state.currentSinceMs = peerId ? Date.now() : null;
    this.lastPeerIdByRoom.set(roomId, peerId);

    this.notifyRoom(roomId, {
      peerId,
      speakingMsByPeer: speakingMsSnapshot(state, Date.now()),
    });
  }

  clearHighlightIfUser(roomId: string, userId: string): void {
    if (this.lastPeerIdByRoom.get(roomId) === userId) {
      this.broadcastIfChanged(roomId, null);
    }
  }

  currentHighlightedPeerId(roomId: string): string | null {
    return this.lastPeerIdByRoom.get(roomId) ?? null;
  }

  forgetRoom(roomId: string): void {
    this.lastPeerIdByRoom.delete(roomId);
    this.speakingByRoom.delete(roomId);
  }

  private roomSpeakingState(roomId: string): RoomSpeakingState {
    let state = this.speakingByRoom.get(roomId);
    if (!state) {
      state = {
        currentPeerId: null,
        currentSinceMs: null,
        speakingMsByPeer: new Map(),
      };
      this.speakingByRoom.set(roomId, state);
    }
    return state;
  }

  private flushSpeakingSegment(roomId: string): void {
    const state = this.speakingByRoom.get(roomId);
    if (!state?.currentPeerId || state.currentSinceMs == null) return;

    const elapsed = Math.max(0, Date.now() - state.currentSinceMs);
    const peerId = state.currentPeerId;
    state.speakingMsByPeer.set(peerId, (state.speakingMsByPeer.get(peerId) ?? 0) + elapsed);
    state.currentSinceMs = null;
  }
}
