/**
 * VoiceIQ RTP tap — PlainTransport + Consumers, indexed by room for late-joining mics.
 *
 * - Ensures the room Router exists on this replica via {@link getOrCreateLocalRoom} (same as WebRTC peers).
 * - Uses the same listen/announced IP pattern as WebRTC transports so UDP works behind NAT.
 * - Publishes `voiceiq_tap_consumer_added` on `rtc:room:{roomId}:events` when a new mic is consumed
 *   so voiceiq-service can extend SSRC → participant mapping without polling.
 */

import { randomUUID } from "crypto";
import type { types as MediasoupTypes } from "mediasoup";
import { env } from "@/shared/config/env";
import { logger } from "@/core/logging";
import { isMicProducerForDominantUI } from "@/modules/peers/dominant-speaker-broadcast";
import * as peerRepository from "@/modules/peers/peer.repository";
import { roomService } from "@/modules/rooms/room.service";

/** Opus-only consumer for external RTP sink (matches router audio codecs). */
export const VOICEIQ_RTP_CAPABILITIES: MediasoupTypes.RtpCapabilities = {
  codecs: [
    {
      kind: "audio",
      mimeType: "audio/opus",
      clockRate: 48000,
      channels: 2,
      preferredPayloadType: 100,
    },
  ],
  headerExtensions: [],
};

export type VoiceIqTapConsumerInfo = {
  consumerId: string;
  producerId: string;
  ssrc: number;
  /** Circlo user id (room peer); VoiceIQ can map to its own participant rows. */
  peerId: string;
  /** Alias of peerId for voiceiq-service clients that expect `participantId`. */
  participantId: string;
};

export type VoiceIqTapCreateOk = {
  ok: true;
  tapId: string;
  rtcServiceIp: string;
  rtcServicePort: number;
  consumers: VoiceIqTapConsumerInfo[];
  sessionId?: string;
};

export type VoiceIqTapCreateErr = {
  ok: false;
  error: string;
  ownerInstanceId?: string;
};

type ActiveTap = {
  tapId: string;
  roomId: string;
  sessionId?: string;
  transport: MediasoupTypes.PlainTransport;
  consumers: MediasoupTypes.Consumer[];
};

const activeTaps = new Map<string, ActiveTap>();
const tapIdsByRoom = new Map<string, Set<string>>();

function indexTap(roomId: string, tapId: string): void {
  let set = tapIdsByRoom.get(roomId);
  if (!set) {
    set = new Set();
    tapIdsByRoom.set(roomId, set);
  }
  set.add(tapId);
}

function unindexTap(roomId: string, tapId: string): void {
  const set = tapIdsByRoom.get(roomId);
  set?.delete(tapId);
  if (set && set.size === 0) {
    tapIdsByRoom.delete(roomId);
  }
}

function collectMicAudioProducers(
  router: MediasoupTypes.Router,
): Array<{ producerId: string; peerId: string }> {
  const result: Array<{ producerId: string; peerId: string }> = [];

  const routerInternal = router as unknown as {
    _transports: Map<string, { _producers?: Map<string, MediasoupTypes.Producer> }>;
  };

  for (const [, transport] of routerInternal._transports ?? new Map()) {
    for (const [producerId, producer] of transport._producers ?? new Map()) {
      if (
        producer.kind === "audio" &&
        !producer.closed &&
        !producer.paused &&
        isMicProducerForDominantUI(producer)
      ) {
        const peerId =
          (producer.appData as Record<string, unknown> | undefined)?.userId != null
            ? String((producer.appData as Record<string, unknown>).userId)
            : producerId;
        result.push({ producerId, peerId });
      }
    }
  }

  return result;
}

export const voiceIqTapService = {
  async createTap(params: {
    roomId: string;
    voiceiqIp: string;
    voiceiqPort: number;
    sessionId?: string;
  }): Promise<VoiceIqTapCreateOk | VoiceIqTapCreateErr> {
    const { roomId, voiceiqIp, voiceiqPort, sessionId } = params;

    const roomResult = await roomService.getOrCreateLocalRoom(roomId);
    if (!roomResult.ok) {
      return {
        ok: false,
        error: "wrong_instance",
        ownerInstanceId: roomResult.ownerInstanceId,
      };
    }

    const { router } = roomResult.room;

    let plainTransport: MediasoupTypes.PlainTransport;
    try {
      plainTransport = await router.createPlainTransport({
        listenInfo: {
          protocol: "udp",
          ip: env.webrtcListenIp,
          announcedAddress: env.webrtcAnnouncedIp,
        },
        rtcpMux: true,
        comedia: false,
      });
    } catch (err) {
      logger.error("Failed to create PlainTransport for VoiceIQ", { roomId, err });
      return { ok: false, error: "plain_transport_failed" };
    }

    try {
      await plainTransport.connect({ ip: voiceiqIp, port: voiceiqPort });
    } catch (err) {
      plainTransport.close();
      logger.error("Failed to connect PlainTransport to VoiceIQ", { err });
      return { ok: false, error: "transport_connect_failed" };
    }

    const micProducers = collectMicAudioProducers(router);
    const consumers: MediasoupTypes.Consumer[] = [];
    const consumerInfos: VoiceIqTapConsumerInfo[] = [];

    for (const { producerId, peerId } of micProducers) {
      try {
        if (!router.canConsume({ producerId, rtpCapabilities: VOICEIQ_RTP_CAPABILITIES })) {
          continue;
        }
        const consumer = await plainTransport.consume({
          producerId,
          rtpCapabilities: VOICEIQ_RTP_CAPABILITIES,
          paused: false,
        });
        consumers.push(consumer);

        const ssrc = consumer.rtpParameters.encodings?.[0]?.ssrc ?? 0;
        consumerInfos.push({
          consumerId: consumer.id,
          producerId,
          ssrc,
          peerId,
          participantId: peerId,
        });

        consumer.on("transportclose", () => {
          const i = consumers.indexOf(consumer);
          if (i >= 0) consumers.splice(i, 1);
        });
        consumer.on("producerclose", () => {
          consumer.close();
        });
      } catch (err) {
        logger.warn("Could not consume producer for VoiceIQ", { producerId, err });
      }
    }

    const tapId = randomUUID();
    const tap: ActiveTap = { tapId, roomId, sessionId, transport: plainTransport, consumers };
    activeTaps.set(tapId, tap);
    indexTap(roomId, tapId);

    plainTransport.on("@close", () => {
      activeTaps.delete(tapId);
      unindexTap(roomId, tapId);
    });

    logger.info("VoiceIQ tap created", {
      tapId,
      roomId,
      voiceiqIp,
      voiceiqPort,
      consumerCount: consumers.length,
      sessionId,
    });

    return {
      ok: true,
      tapId,
      rtcServiceIp: plainTransport.tuple.localAddress,
      rtcServicePort: plainTransport.tuple.localPort,
      consumers: consumerInfos,
      sessionId,
    };
  },

  /** Close every VoiceIQ PlainTransport for `roomId` (before mediasoup Router teardown). */
  releaseAllTapsForRoom(roomId: string): void {
    const ids = tapIdsByRoom.get(roomId);
    if (!ids || ids.size === 0) {
      return;
    }
    for (const tapId of [...ids]) {
      this.releaseTap(tapId);
    }
  },

  releaseTap(tapId: string): { ok: true } | { ok: false; error: string } {
    const tap = activeTaps.get(tapId);
    if (!tap) {
      return { ok: false, error: "tap_not_found" };
    }

    for (const consumer of tap.consumers) {
      try {
        consumer.close();
      } catch {
        /* ignore */
      }
    }
    try {
      tap.transport.close();
    } catch {
      /* ignore */
    }

    activeTaps.delete(tapId);
    unindexTap(tap.roomId, tapId);
    logger.info("VoiceIQ tap released", { tapId });

    return { ok: true };
  },

  /**
   * When a peer starts sending mic audio after the tap exists, attach a Consumer on every active tap.
   */
  async onMicAudioProducerAdded(
    roomId: string,
    producer: MediasoupTypes.Producer,
    peerId: string,
  ): Promise<void> {
    if (!isMicProducerForDominantUI(producer)) {
      return;
    }

    const tapIds = tapIdsByRoom.get(roomId);
    if (!tapIds || tapIds.size === 0) {
      return;
    }

    const localRoom = roomService.getLocalRoom(roomId);
    if (!localRoom) {
      return;
    }

    const { router } = localRoom;

    for (const tapId of tapIds) {
      const tap = activeTaps.get(tapId);
      if (!tap) {
        continue;
      }

      try {
        if (
          !router.canConsume({
            producerId: producer.id,
            rtpCapabilities: VOICEIQ_RTP_CAPABILITIES,
          })
        ) {
          continue;
        }

        const consumer = await tap.transport.consume({
          producerId: producer.id,
          rtpCapabilities: VOICEIQ_RTP_CAPABILITIES,
          paused: false,
        });

        tap.consumers.push(consumer);

        const ssrc = consumer.rtpParameters.encodings?.[0]?.ssrc ?? 0;

        consumer.on("transportclose", () => {
          const i = tap.consumers.indexOf(consumer);
          if (i >= 0) {
            tap.consumers.splice(i, 1);
          }
        });
        consumer.on("producerclose", () => {
          consumer.close();
        });

        await peerRepository.publishRoomMediaEvent(roomId, {
          type: "voiceiq_tap_consumer_added",
          roomId,
          tapId,
          sessionId: tap.sessionId,
          peerId,
          producerId: producer.id,
          consumerId: consumer.id,
          ssrc,
        });

        logger.info("VoiceIQ tap consumer added (late joiner)", {
          tapId,
          roomId,
          peerId,
          ssrc,
        });
      } catch (err) {
        logger.warn("VoiceIQ tap: failed to consume new producer", {
          tapId,
          producerId: producer.id,
          err,
        });
      }
    }
  },
};
