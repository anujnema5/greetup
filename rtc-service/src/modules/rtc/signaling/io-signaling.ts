import type { Server } from "socket.io";
import { logger } from "@/core/logging";
import { PeerSessionService } from "@/modules/rtc/peer/peer.service";
import { registerMediasoupSocketHandlers } from "@/modules/rtc/signaling/mediasoup-events";

export function registerSignalingHandlers(io: Server): PeerSessionService {
  const peers = new PeerSessionService();

  io.on("connection", (socket) => {
    logger.info("Client connected", {
      socketId: socket.id,
      userId: socket.data.userId,
      roomId: socket.data.roomId,
    });
    registerMediasoupSocketHandlers(socket, peers);
  });

  return peers;
}
