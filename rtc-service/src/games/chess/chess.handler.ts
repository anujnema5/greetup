import type { Server } from "socket.io";
import { logger } from "@/core/logger";

export function registerChessHandlers(io: Server): void {
  const chess = io.of("/chess");

  chess.on("connection", (socket) => {
    logger.info("Chess client connected", { socketId: socket.id });

    // TODO: socket.on("move", ...)
    // TODO: socket.on("resign", ...)
    // TODO: socket.on("offerDraw", ...)

    socket.on("disconnect", (reason) => {
      logger.info("Chess client disconnected", { socketId: socket.id, reason });
    });
  });
}
