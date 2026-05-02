/**
 * In-memory mediasoup peer session + Redis room membership for video/WebRTC.
 * Socket event surface: `signaling/mediasoup-socket.handlers.ts`.
 */
import type { types as MediasoupTypes } from "mediasoup";
import type { Socket } from "socket.io";
import { RTC_CONFIG } from "@/config/constants";
import { env } from "@/config/env";
import { logger } from "@/core/logger";
import * as peerRepository from "@/peers/peer.repository";
import type { PeerRecord } from "@/peers/peer.types";
import { mediaSourceFromProducerAppData, type ProducerMediaSource } from "@/peers/media-source.util";
import { roomService } from "@/rooms/room.service";
import type { RoomSessionType } from "@/types/room-session";

export type ExistingProducerInfo = {
  peerId: string;
  producerId: string;
  kind: MediasoupTypes.MediaKind;
  /** Present for video producers; defaults to camera when omitted (legacy clients). */
  mediaSource?: ProducerMediaSource;
};

type PeerSession = {
  userId: string;
  roomId: string;
  socket: Socket;
  transports: Map<string, MediasoupTypes.WebRtcTransport>;
  producers: Map<string, MediasoupTypes.Producer>;
  consumers: Map<string, MediasoupTypes.Consumer>;
};

type RemoveSessionOptions = {
  skipRedis?: boolean;
  skipSocketLeave?: boolean;
  /** When false, keep mediasoup Router / Redis room if this peer was the last local member (used before same-user re-join). */
  releaseRoomIfEmpty?: boolean;
};

export class PeerSessionService {
  private readonly sessions = new Map<string, PeerSession>();
  private readonly roomMembers = new Map<string, Set<string>>();
  /** userId → display name, set on join, cleared on leave. */
  private readonly displayNames = new Map<string, string>();
  /** userId → profile image URL, set on join, cleared on leave. */
  private readonly profileImages = new Map<string, string>();

  async join(socket: Socket, displayName?: string, profileImageUrl?: string): Promise<
    | {
        ok: true;
        rtpCapabilities: MediasoupTypes.RtpCapabilities;
        peerIds: string[];
        peerNames: Record<string, string>;
        peerImages: Record<string, string>;
        existingProducers: ExistingProducerInfo[];
      }
    | { ok: false; code: "WRONG_INSTANCE"; ownerInstanceId: string }
    | { ok: false; code: string }
  > {
    const userId = socket.data.userId;
    const roomId = socket.data.roomId;
    if (!userId || !roomId) return { ok: false, code: "missing_context" };

    await this.removeSession(userId, {
      skipRedis: true,
      skipSocketLeave: false,
      releaseRoomIfEmpty: false,
    });

    const roomResult = await roomService.getOrCreateLocalRoom(roomId);
    if (!roomResult.ok) {
      return { ok: false, code: "WRONG_INSTANCE", ownerInstanceId: roomResult.ownerInstanceId };
    }

    await socket.join(roomId);

    const joinedAt = new Date().toISOString();
    const record: PeerRecord = {
      id: userId,
      roomId,
      joinedAt,
      rtcInstanceId: env.rtcInstanceId,
      socketId: socket.id,
    };
    await peerRepository.savePeer(record);

    const session: PeerSession = {
      userId,
      roomId,
      socket,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
    };
    this.sessions.set(userId, session);

    let members = this.roomMembers.get(roomId);
    if (!members) {
      members = new Set();
      this.roomMembers.set(roomId, members);
    }
    members.add(userId);

    if (displayName) this.displayNames.set(userId, displayName);
    if (profileImageUrl) this.profileImages.set(userId, profileImageUrl);

    socket.to(roomId).emit("peerJoined", {
      peerId: userId,
      displayName: displayName ?? null,
      image: profileImageUrl ?? null,
    });

    const peerIds = Array.from(members);
    const peerNames: Record<string, string> = {};
    const peerImages: Record<string, string> = {};
    for (const pid of peerIds) {
      const name = this.displayNames.get(pid);
      if (name) peerNames[pid] = name;
      const image = this.profileImages.get(pid);
      if (image) peerImages[pid] = image;
    }
    const existingProducers = this.collectProducersInRoom(roomId, userId);

    logger.info("Peer joined mediasoup room", { userId, roomId, peerCount: peerIds.length });

    return {
      ok: true,
      rtpCapabilities: roomResult.room.router.rtpCapabilities,
      peerIds,
      peerNames,
      peerImages,
      existingProducers,
    };
  }

  async createWebRtcTransport(
    userId: string,
    direction: "send" | "recv",
  ): Promise<
    | {
        ok: true;
        id: string;
        iceParameters: MediasoupTypes.IceParameters;
        iceCandidates: MediasoupTypes.IceCandidate[];
        dtlsParameters: MediasoupTypes.DtlsParameters;
        sctpParameters?: MediasoupTypes.SctpParameters | null;
      }
    | { ok: false; code: string }
  > {
    const session = this.sessions.get(userId);
    if (!session) return { ok: false, code: "not_joined" };

    const localRoom = roomService.getLocalRoom(session.roomId);
    if (!localRoom) return { ok: false, code: "room_missing" };

    const transport = await localRoom.router.createWebRtcTransport({
      listenInfos: [...RTC_CONFIG.webRtcTransport.listenInfos],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: RTC_CONFIG.webRtcTransport.initialAvailableOutgoingBitrate,
      appData: { direction },
    });

    transport.on("dtlsstatechange", (dtlsState) => {
      if (dtlsState === "closed") transport.close();
    });

    transport.on("@close", () => {
      session.transports.delete(transport.id);
    });

    session.transports.set(transport.id, transport);

    return {
      ok: true,
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      sctpParameters: transport.sctpParameters,
    };
  }

  async connectTransport(
    userId: string,
    payload: { transportId: string; dtlsParameters: MediasoupTypes.DtlsParameters },
  ): Promise<{ ok: true } | { ok: false; code: string }> {
    const session = this.sessions.get(userId);
    if (!session) return { ok: false, code: "not_joined" };
    const transport = session.transports.get(payload.transportId);
    if (!transport) return { ok: false, code: "transport_not_found" };

    await transport.connect({ dtlsParameters: payload.dtlsParameters });
    return { ok: true };
  }

  async restartIce(
    userId: string,
    transportId: string,
  ): Promise<{ ok: true; iceParameters: MediasoupTypes.IceParameters } | { ok: false; code: string }> {
    const session = this.sessions.get(userId);
    if (!session) return { ok: false, code: "not_joined" };
    const transport = session.transports.get(transportId);
    if (!transport) return { ok: false, code: "transport_not_found" };

    const iceParameters = await transport.restartIce();
    return { ok: true, iceParameters };
  }

  async produce(
    userId: string,
    payload: {
      transportId: string;
      kind: MediasoupTypes.MediaKind;
      rtpParameters: MediasoupTypes.RtpParameters;
      appData?: Record<string, unknown>;
    },
  ): Promise<{ ok: true; id: string } | { ok: false; code: string }> {
    const session = this.sessions.get(userId);
    if (!session) return { ok: false, code: "not_joined" };
    const transport = session.transports.get(payload.transportId);
    if (!transport) return { ok: false, code: "transport_not_found" };

    const producer = await transport.produce({
      kind: payload.kind,
      rtpParameters: payload.rtpParameters,
      appData: payload.appData,
    });

    producer.on("transportclose", () => {
      session.producers.delete(producer.id);
    });

    session.producers.set(producer.id, producer);

    await peerRepository.publishRoomMediaEvent(session.roomId, {
      type: "producer_added",
      roomId: session.roomId,
      peerId: userId,
      producerId: producer.id,
      kind: producer.kind,
    });

    const newProducerPayload: {
      peerId: string;
      producerId: string;
      kind: MediasoupTypes.MediaKind;
      mediaSource?: ProducerMediaSource;
    } = {
      peerId: userId,
      producerId: producer.id,
      kind: producer.kind,
    };
    if (producer.kind === "video") {
      newProducerPayload.mediaSource = mediaSourceFromProducerAppData(
        payload.appData ?? producer.appData,
      );
    }

    session.socket.to(session.roomId).emit("newProducer", newProducerPayload);

    return { ok: true, id: producer.id };
  }

  /**
   * Pause a producer and notify room peers so they can show a placeholder (e.g. camera-off initials).
   * The mediasoup producer stays alive — the peer can resume it without a new `getUserMedia`.
   */
  async pauseProducer(
    userId: string,
    producerId: string,
  ): Promise<{ ok: true } | { ok: false; code: string }> {
    const session = this.sessions.get(userId);
    if (!session) return { ok: false, code: "not_joined" };
    const producer = session.producers.get(producerId);
    if (!producer) return { ok: false, code: "producer_not_found" };

    try {
      await producer.pause();
    } catch {
      /* ignore */
    }

    const mediaSource = mediaSourceFromProducerAppData(producer.appData);
    session.socket.to(session.roomId).emit("producerPaused", {
      peerId: userId,
      producerId,
      kind: producer.kind,
      mediaSource,
    });
    return { ok: true };
  }

  /**
   * Resume a paused producer and notify room peers.
   */
  async resumeProducer(
    userId: string,
    producerId: string,
  ): Promise<{ ok: true } | { ok: false; code: string }> {
    const session = this.sessions.get(userId);
    if (!session) return { ok: false, code: "not_joined" };
    const producer = session.producers.get(producerId);
    if (!producer) return { ok: false, code: "producer_not_found" };

    try {
      await producer.resume();
    } catch {
      /* ignore */
    }

    const mediaSource = mediaSourceFromProducerAppData(producer.appData);
    session.socket.to(session.roomId).emit("producerResumed", {
      peerId: userId,
      producerId,
      kind: producer.kind,
      mediaSource,
    });
    return { ok: true };
  }

  /**
   * Tear down a producer we own. Required when the browser closes a track / mediasoup-client
   * `Producer.close()` — that only stops local sending and does not remove the router producer,
   * so peers would otherwise keep a frozen consumer until disconnect.
   */
  async closeProducer(
    userId: string,
    producerId: string,
  ): Promise<{ ok: true } | { ok: false; code: string }> {
    const session = this.sessions.get(userId);
    if (!session) return { ok: false, code: "not_joined" };
    const producer = session.producers.get(producerId);
    if (!producer) return { ok: false, code: "producer_not_found" };

    const { roomId, socket } = session;
    socket.to(roomId).emit("producerClosed", { peerId: userId, producerId });
    try {
      producer.close();
    } catch {
      /* ignore */
    }
    session.producers.delete(producerId);
    void peerRepository.publishRoomMediaEvent(roomId, {
      type: "producer_removed",
      roomId,
      peerId: userId,
      producerId,
    });
    return { ok: true };
  }

  async consume(
    userId: string,
    payload: {
      transportId: string;
      producerId: string;
      rtpCapabilities: MediasoupTypes.RtpCapabilities;
      paused?: boolean;
    },
  ): Promise<
    | {
        ok: true;
        id: string;
        producerId: string;
        kind: MediasoupTypes.MediaKind;
        rtpParameters: MediasoupTypes.RtpParameters;
        type: MediasoupTypes.ConsumerType;
        producerPaused: boolean;
        paused: boolean;
        /** From producer `appData` — authoritative vs `newProducer` socket payload for UI track roles. */
        mediaSource?: ProducerMediaSource;
      }
    | { ok: false; code: string }
  > {
    const session = this.sessions.get(userId);
    if (!session) return { ok: false, code: "not_joined" };
    const transport = session.transports.get(payload.transportId);
    if (!transport) return { ok: false, code: "transport_not_found" };

    const { producerId, rtpCapabilities } = payload;
    const producer = this.findProducerInRoom(session.roomId, producerId);
    if (!producer) return { ok: false, code: "producer_not_found" };

    const localRoom = roomService.getLocalRoom(session.roomId);
    if (!localRoom) return { ok: false, code: "room_missing" };

    if (!localRoom.router.canConsume({ producerId, rtpCapabilities })) {
      return { ok: false, code: "cannot_consume" };
    }

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: Boolean(payload.paused),
    });

    consumer.on("transportclose", () => {
      session.consumers.delete(consumer.id);
    });

    session.consumers.set(consumer.id, consumer);

    const base = {
      ok: true as const,
      id: consumer.id,
      producerId: consumer.producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      type: consumer.type,
      producerPaused: consumer.producerPaused,
      paused: consumer.paused,
    };
    if (consumer.kind === "video") {
      return {
        ...base,
        mediaSource: mediaSourceFromProducerAppData(producer.appData),
      };
    }
    return base;
  }

  async resumeConsumer(userId: string, consumerId: string): Promise<{ ok: true } | { ok: false; code: string }> {
    const session = this.sessions.get(userId);
    if (!session) return { ok: false, code: "not_joined" };
    const consumer = session.consumers.get(consumerId);
    if (!consumer) return { ok: false, code: "consumer_not_found" };
    await consumer.resume();
    return { ok: true };
  }

  async onSocketDisconnect(socket: Socket): Promise<void> {
    const userId = socket.data.userId;
    if (!userId) return;
    await this.removeSession(userId, { skipRedis: false, skipSocketLeave: true, releaseRoomIfEmpty: true });
  }

  /**
   * Explicit leave from client while keeping the underlying socket connected
   * (e.g. user exits room but remains logged in on the app).
   */
  async leave(userId: string): Promise<void> {
    await this.removeSession(userId, {
      skipRedis: false,
      skipSocketLeave: false,
      releaseRoomIfEmpty: true,
    });
  }

  /**
   * Updates JWT-derived `roomType` on all mediasoup sessions in a Socket.IO room (e.g. direct → circle)
   * without disconnecting transports — used when the main API expands a 1:1 call in place.
   */
  setRoomTypeForRoomPeers(roomId: string, roomType: RoomSessionType): { updated: number } {
    let updated = 0;
    const members = this.roomMembers.get(roomId);
    if (!members) {
      logger.info("setRoomTypeForRoomPeers: no local members", { roomId, roomType });
      return { updated: 0 };
    }
    for (const uid of members) {
      const session = this.sessions.get(uid);
      if (!session) continue;
      session.socket.data.roomType = roomType;
      updated += 1;
    }
    logger.info("setRoomTypeForRoomPeers", { roomId, roomType, updated });
    return { updated };
  }

  private collectProducersInRoom(roomId: string, excludeUserId: string): ExistingProducerInfo[] {
    const out: ExistingProducerInfo[] = [];
    const members = this.roomMembers.get(roomId);
    if (!members) return out;
    for (const uid of members) {
      if (uid === excludeUserId) continue;
      const s = this.sessions.get(uid);
      if (!s) continue;
      for (const producer of s.producers.values()) {
        const row: ExistingProducerInfo = {
          peerId: uid,
          producerId: producer.id,
          kind: producer.kind,
        };
        if (producer.kind === "video") {
          row.mediaSource = mediaSourceFromProducerAppData(producer.appData);
        }
        out.push(row);
      }
    }
    return out;
  }

  private findProducerInRoom(roomId: string, producerId: string): MediasoupTypes.Producer | null {
    const members = this.roomMembers.get(roomId);
    if (!members) return null;
    for (const uid of members) {
      const s = this.sessions.get(uid);
      const p = s?.producers.get(producerId);
      if (p) return p;
    }
    return null;
  }

  private async removeSession(userId: string, opts: RemoveSessionOptions = {}): Promise<void> {
    const session = this.sessions.get(userId);
    if (!session) return;

    const { roomId, socket } = session;

    socket.to(roomId).emit("peerLeft", { peerId: userId });

    const producerIds = Array.from(session.producers.keys());
    for (const producerId of producerIds) {
      socket.to(roomId).emit("producerClosed", { peerId: userId, producerId });
      await peerRepository.publishRoomMediaEvent(roomId, {
        type: "producer_removed",
        roomId,
        peerId: userId,
        producerId,
      });
    }

    for (const transport of session.transports.values()) {
      transport.close();
    }
    session.transports.clear();
    session.producers.clear();
    session.consumers.clear();

    this.sessions.delete(userId);
    this.displayNames.delete(userId);
    this.profileImages.delete(userId);

    const members = this.roomMembers.get(roomId);
    if (members) {
      members.delete(userId);
      if (members.size === 0) {
        this.roomMembers.delete(roomId);
        if (opts.releaseRoomIfEmpty !== false) {
          await roomService.releaseRoom(roomId);
        }
      }
    }

    if (!opts.skipRedis) {
      await peerRepository.deletePeer(userId, roomId);
      await peerRepository.clearUserActiveRtcRoomIfMatches(userId, roomId);
    }

    if (!opts.skipSocketLeave) {
      try {
        await socket.leave(roomId);
      } catch {
        // ignore
      }
    }

    logger.info("Peer session removed", { userId, roomId });
  }
}
