import type { Server, Socket } from "socket.io";
import { logger } from "@/core/logger";

export function registerSignalingHandlers(io: Server): void {
  io.on("connection", (socket: Socket) => {
    logger.info("Client connected", {
      socketId: socket.id,
      userId: socket.data.userId,
      roomId: socket.data.roomId,
    });

    // TODO: handle join — peer joins a room, router RTP capabilities sent back
    socket.on("join", (_payload, _ack) => {
      logger.debug("join", { socketId: socket.id });
    });

    // TODO: handle createWebRtcTransport — send/recv transport creation
    socket.on("createWebRtcTransport", (_payload, _ack) => {
      logger.debug("createWebRtcTransport", { socketId: socket.id });
    });

    // TODO: handle connectTransport — DTLS handshake
    socket.on("connectTransport", (_payload, _ack) => {
      logger.debug("connectTransport", { socketId: socket.id });
    });

    // TODO: handle produce — peer starts sending media
    socket.on("produce", (_payload, _ack) => {
      logger.debug("produce", { socketId: socket.id });
    });

    // TODO: handle consume — peer wants to receive another peer's media
    socket.on("consume", (_payload, _ack) => {
      logger.debug("consume", { socketId: socket.id });
    });

    socket.on("disconnect", (reason) => {
      logger.info("Client disconnected", { socketId: socket.id, reason });
      // TODO: cleanup peer state on disconnect
    });

    socket.on("error", (err) => {
      logger.error("Socket error", { socketId: socket.id, err });
    });
  });
}
