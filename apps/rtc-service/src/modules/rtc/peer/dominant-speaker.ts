import type { types as MediasoupTypes } from "mediasoup";
import type { LocalRoom } from "@/modules/rtc/room/room-registry";
import { logger } from "@/core/logging";
import { mediaSourceFromProducerAppData } from "@/modules/rtc/peer/media-source";

export const DOMINANT_SPEAKER_SOCKET_EVENT = "dominantSpeaker" as const;

/** Log when a dominant segment reaches at least this many ms (debugging sticky / sort order). */
const SPEAKING_SEGMENT_LOG_MS = 3_000;

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

function peerIdShort(peerId: string | null): string {
  if (!peerId) return "none";
  return peerId.length > 12 ? `${peerId.slice(0, 8)}…` : peerId;
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

    logger.info("dominantSpeaker: AudioLevelObserver attached", { roomId });

    room.audioLevelObserver.on("volumes", (volumes: VolumeSample[]) => {
      if (volumes.length === 0) {
        this.broadcastIfChanged(roomId, null, "volumes_empty");
        return;
      }
      const producerId = producerIdOfLoudestVolume(volumes);
      if (!producerId) return;
      const peerId = resolvePeerId(producerId);
      if (!peerId) {
        logger.debug("dominantSpeaker: loudest producer has no peer", {
          roomId,
          producerId,
          volumeCount: volumes.length,
        });
        return;
      }
      this.broadcastIfChanged(roomId, peerId, "volumes");
    });

    room.audioLevelObserver.on("silence", () => {
      this.broadcastIfChanged(roomId, null, "silence");
    });
  }

  async addMicProducer(room: LocalRoom, producerId: string): Promise<void> {
    try {
      await room.audioLevelObserver.addProducer({ producerId });
      logger.info("dominantSpeaker: mic producer registered", {
        roomId: room.roomId,
        producerId,
      });
    } catch (err) {
      logger.warn("dominantSpeaker: AudioLevelObserver addProducer failed", {
        roomId: room.roomId,
        producerId,
        err,
      });
    }
  }

  async removeMicProducer(room: LocalRoom, producerId: string): Promise<void> {
    try {
      await room.audioLevelObserver.removeProducer({ producerId });
      logger.info("dominantSpeaker: mic producer unregistered", {
        roomId: room.roomId,
        producerId,
      });
    } catch (err) {
      logger.debug("dominantSpeaker: removeProducer failed (ignored)", {
        roomId: room.roomId,
        producerId,
        err,
      });
    }
  }

  broadcastIfChanged(
    roomId: string,
    peerId: string | null,
    trigger: "volumes" | "volumes_empty" | "silence" | "clear_user" | "manual",
  ): void {
    const prev = this.lastPeerIdByRoom.get(roomId) ?? null;
    if (prev === peerId) return;

    const flushed = this.flushSpeakingSegment(roomId);
    const state = this.roomSpeakingState(roomId);
    state.currentPeerId = peerId;
    state.currentSinceMs = peerId ? Date.now() : null;
    this.lastPeerIdByRoom.set(roomId, peerId);

    const speakingMsByPeer = speakingMsSnapshot(state, Date.now());
    const payload: DominantSpeakerSocketPayload = { peerId, speakingMsByPeer };

    logger.info("dominantSpeaker: changed", {
      roomId,
      trigger,
      previousPeerId: peerIdShort(prev),
      peerId: peerIdShort(peerId),
      flushedSegmentMs: flushed?.segmentMs ?? null,
      flushedPeerId: flushed ? peerIdShort(flushed.peerId) : null,
      flushedTotalMs: flushed?.totalMs ?? null,
      segmentReached3s: (flushed?.segmentMs ?? 0) >= SPEAKING_SEGMENT_LOG_MS,
      speakingMsByPeer,
    });

    this.notifyRoom(roomId, payload);
  }

  clearHighlightIfUser(roomId: string, userId: string): void {
    if (this.lastPeerIdByRoom.get(roomId) === userId) {
      logger.info("dominantSpeaker: clear highlight (user left or muted)", {
        roomId,
        peerId: peerIdShort(userId),
      });
      this.broadcastIfChanged(roomId, null, "clear_user");
    }
  }

  currentHighlightedPeerId(roomId: string): string | null {
    return this.lastPeerIdByRoom.get(roomId) ?? null;
  }

  forgetRoom(roomId: string): void {
    const prev = this.lastPeerIdByRoom.get(roomId) ?? null;
    const state = this.speakingByRoom.get(roomId);
    const speakingMsByPeer = state
      ? Object.fromEntries(state.speakingMsByPeer.entries())
      : undefined;

    this.lastPeerIdByRoom.delete(roomId);
    this.speakingByRoom.delete(roomId);

    logger.info("dominantSpeaker: room state cleared", {
      roomId,
      lastPeerId: peerIdShort(prev),
      speakingMsByPeer,
    });
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

  private flushSpeakingSegment(
    roomId: string,
  ): { peerId: string; segmentMs: number; totalMs: number } | null {
    const state = this.speakingByRoom.get(roomId);
    if (!state?.currentPeerId || state.currentSinceMs == null) return null;

    const elapsed = Math.max(0, Date.now() - state.currentSinceMs);
    const peerId = state.currentPeerId;
    const totalMs = (state.speakingMsByPeer.get(peerId) ?? 0) + elapsed;
    state.speakingMsByPeer.set(peerId, totalMs);
    state.currentSinceMs = null;

    logger.info("dominantSpeaker: speaking segment flushed", {
      roomId,
      peerId: peerIdShort(peerId),
      segmentMs: elapsed,
      cumulativeMs: totalMs,
      reached3s: elapsed >= SPEAKING_SEGMENT_LOG_MS,
    });

    return { peerId, segmentMs: elapsed, totalMs };
  }
}
