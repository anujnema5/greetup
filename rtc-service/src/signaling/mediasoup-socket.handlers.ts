import type { Socket } from "socket.io";
import { logger } from "@/core/logger";
import { env } from "@/config/env";
import { PeerSessionService } from "@/peers/peer.service";
import { asSocketAck } from "@/signaling/socket-ack.util";
import {
  parseCloseProducerPayload,
  parseConnectTransportPayload,
  parseConsumePayload,
  parseCreateWebRtcTransportPayload,
  parsePauseResumeProducerPayload,
  parseProducePayload,
  parseRestartIcePayload,
  parseResumeConsumerPayload,
} from "@/signaling/mediasoup-payloads";

/**
 * Mediasoup / WebRTC signaling for video calls — Socket.IO events consumed by `mediasoup-client`.
 * Session logic lives in {@link PeerSessionService}.
 */
export function registerMediasoupSocketHandlers(socket: Socket, peers: PeerSessionService): void {
  socket.on("join", async (payload, ack) => {
    const reply = asSocketAck(ack);
    const displayName = typeof (payload as { displayName?: unknown })?.displayName === "string"
      ? ((payload as { displayName: string }).displayName || undefined)
      : undefined;
    const image = typeof (payload as { image?: unknown })?.image === "string"
      ? ((payload as { image: string }).image || undefined)
      : undefined;
    try {
      const result = await peers.join(socket, displayName, image);
      if (!result.ok) {
        if ("ownerInstanceId" in result) {
          reply({
            ok: false,
            error: { code: result.code, ownerInstanceId: result.ownerInstanceId },
          });
          return;
        }
        reply({ ok: false, error: { code: result.code } });
        return;
      }
      reply({
        ok: true,
        rtpCapabilities: result.rtpCapabilities,
        peerIds: result.peerIds,
        peerNames: result.peerNames,
        peerImages: result.peerImages,
        existingProducers: result.existingProducers,
        rtcInstanceId: env.rtcInstanceId,
      });
    } catch (err) {
      logger.error("join failed", { socketId: socket.id, err: String(err) });
      reply({ ok: false, error: { code: "join_failed", message: String(err) } });
    }
  });

  socket.on("createWebRtcTransport", async (payload: unknown, ack) => {
    const reply = asSocketAck(ack);
    const userId = socket.data.userId;
    if (!userId) {
      reply({ ok: false, error: { code: "unauthorized" } });
      return;
    }
    const direction = parseCreateWebRtcTransportPayload(payload);
    try {
      const result = await peers.createWebRtcTransport(userId, direction);
      if (!result.ok) {
        reply({ ok: false, error: { code: result.code } });
        return;
      }
      reply({
        ok: true,
        id: result.id,
        iceParameters: result.iceParameters,
        iceCandidates: result.iceCandidates,
        dtlsParameters: result.dtlsParameters,
        sctpParameters: result.sctpParameters,
      });
    } catch (err) {
      logger.error("createWebRtcTransport failed", { socketId: socket.id, err: String(err) });
      reply({ ok: false, error: { code: "create_transport_failed", message: String(err) } });
    }
  });

  socket.on("connectTransport", async (payload: unknown, ack) => {
    const reply = asSocketAck(ack);
    const userId = socket.data.userId;
    if (!userId) {
      reply({ ok: false, error: { code: "unauthorized" } });
      return;
    }
    const parsed = parseConnectTransportPayload(payload);
    if (!parsed) {
      reply({ ok: false, error: { code: "invalid_payload" } });
      return;
    }
    try {
      const result = await peers.connectTransport(userId, parsed);
      if (!result.ok) {
        reply({ ok: false, error: { code: result.code } });
        return;
      }
      reply({ ok: true });
    } catch (err) {
      logger.error("connectTransport failed", { socketId: socket.id, err: String(err) });
      reply({ ok: false, error: { code: "connect_transport_failed", message: String(err) } });
    }
  });

  socket.on("restartIce", async (payload: unknown, ack) => {
    const reply = asSocketAck(ack);
    const userId = socket.data.userId;
    if (!userId) {
      reply({ ok: false, error: { code: "unauthorized" } });
      return;
    }
    const parsed = parseRestartIcePayload(payload);
    if (!parsed) {
      reply({ ok: false, error: { code: "invalid_payload" } });
      return;
    }
    try {
      const result = await peers.restartIce(userId, parsed.transportId);
      if (!result.ok) {
        reply({ ok: false, error: { code: result.code } });
        return;
      }
      reply({ ok: true, iceParameters: result.iceParameters });
    } catch (err) {
      logger.error("restartIce failed", { socketId: socket.id, err: String(err) });
      reply({ ok: false, error: { code: "restart_ice_failed", message: String(err) } });
    }
  });

  socket.on("produce", async (payload: unknown, ack) => {
    const reply = asSocketAck(ack);
    const userId = socket.data.userId;
    if (!userId) {
      reply({ ok: false, error: { code: "unauthorized" } });
      return;
    }
    const parsed = parseProducePayload(payload);
    if (!parsed) {
      reply({ ok: false, error: { code: "invalid_payload" } });
      return;
    }
    try {
      const result = await peers.produce(userId, parsed);
      if (!result.ok) {
        reply({ ok: false, error: { code: result.code } });
        return;
      }
      reply({ ok: true, id: result.id });
    } catch (err) {
      logger.error("produce failed", { socketId: socket.id, err: String(err) });
      reply({ ok: false, error: { code: "produce_failed", message: String(err) } });
    }
  });

  socket.on("pauseProducer", async (payload: unknown, ack) => {
    const reply = asSocketAck(ack);
    const userId = socket.data.userId;
    if (!userId) {
      reply({ ok: false, error: { code: "unauthorized" } });
      return;
    }
    const producerId = parsePauseResumeProducerPayload(payload);
    if (!producerId) {
      reply({ ok: false, error: { code: "invalid_payload" } });
      return;
    }
    try {
      const result = await peers.pauseProducer(userId, producerId);
      if (!result.ok) {
        reply({ ok: false, error: { code: result.code } });
        return;
      }
      reply({ ok: true });
    } catch (err) {
      logger.error("pauseProducer failed", { socketId: socket.id, err: String(err) });
      reply({ ok: false, error: { code: "pause_producer_failed", message: String(err) } });
    }
  });

  socket.on("resumeProducer", async (payload: unknown, ack) => {
    const reply = asSocketAck(ack);
    const userId = socket.data.userId;
    if (!userId) {
      reply({ ok: false, error: { code: "unauthorized" } });
      return;
    }
    const producerId = parsePauseResumeProducerPayload(payload);
    if (!producerId) {
      reply({ ok: false, error: { code: "invalid_payload" } });
      return;
    }
    try {
      const result = await peers.resumeProducer(userId, producerId);
      if (!result.ok) {
        reply({ ok: false, error: { code: result.code } });
        return;
      }
      reply({ ok: true });
    } catch (err) {
      logger.error("resumeProducer failed", { socketId: socket.id, err: String(err) });
      reply({ ok: false, error: { code: "resume_producer_failed", message: String(err) } });
    }
  });

  socket.on("closeProducer", async (payload: unknown, ack) => {
    const reply = asSocketAck(ack);
    const userId = socket.data.userId;
    if (!userId) {
      reply({ ok: false, error: { code: "unauthorized" } });
      return;
    }
    const producerId = parseCloseProducerPayload(payload);
    if (!producerId) {
      reply({ ok: false, error: { code: "invalid_payload" } });
      return;
    }
    try {
      const result = await peers.closeProducer(userId, producerId);
      if (!result.ok) {
        reply({ ok: false, error: { code: result.code } });
        return;
      }
      reply({ ok: true });
    } catch (err) {
      logger.error("closeProducer failed", { socketId: socket.id, err: String(err) });
      reply({ ok: false, error: { code: "close_producer_failed", message: String(err) } });
    }
  });

  socket.on("consume", async (payload: unknown, ack) => {
    const reply = asSocketAck(ack);
    const userId = socket.data.userId;
    if (!userId) {
      reply({ ok: false, error: { code: "unauthorized" } });
      return;
    }
    const parsed = parseConsumePayload(payload);
    if (!parsed) {
      reply({ ok: false, error: { code: "invalid_payload" } });
      return;
    }
    try {
      const result = await peers.consume(userId, parsed);
      if (!result.ok) {
        reply({ ok: false, error: { code: result.code } });
        return;
      }
      reply({
        ok: true,
        id: result.id,
        producerId: result.producerId,
        kind: result.kind,
        rtpParameters: result.rtpParameters,
        type: result.type,
        producerPaused: result.producerPaused,
        paused: result.paused,
      });
    } catch (err) {
      logger.error("consume failed", { socketId: socket.id, err: String(err) });
      reply({ ok: false, error: { code: "consume_failed", message: String(err) } });
    }
  });

  socket.on("resumeConsumer", async (payload: unknown, ack) => {
    const reply = asSocketAck(ack);
    const userId = socket.data.userId;
    if (!userId) {
      reply({ ok: false, error: { code: "unauthorized" } });
      return;
    }
    const consumerId = parseResumeConsumerPayload(payload);
    if (!consumerId) {
      reply({ ok: false, error: { code: "invalid_payload" } });
      return;
    }
    try {
      const result = await peers.resumeConsumer(userId, consumerId);
      if (!result.ok) {
        reply({ ok: false, error: { code: result.code } });
        return;
      }
      reply({ ok: true });
    } catch (err) {
      logger.error("resumeConsumer failed", { socketId: socket.id, err: String(err) });
      reply({ ok: false, error: { code: "resume_consumer_failed", message: String(err) } });
    }
  });

  socket.on("disconnect", (reason) => {
    logger.info("Client disconnected", { socketId: socket.id, reason });
    void peers.onSocketDisconnect(socket);
  });

  socket.on("leave", async (ack) => {
    const reply = asSocketAck(ack);
    const userId = socket.data.userId;
    if (!userId) {
      reply({ ok: false, error: { code: "unauthorized" } });
      return;
    }
    try {
      await peers.leave(userId);
      reply({ ok: true });
    } catch (err) {
      logger.error("leave failed", { socketId: socket.id, err: String(err) });
      reply({ ok: false, error: { code: "leave_failed", message: String(err) } });
    }
  });

  socket.on("error", (err) => {
    logger.error("Socket error", { socketId: socket.id, err });
  });
}
