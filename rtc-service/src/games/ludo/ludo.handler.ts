import type { Server } from "socket.io";
import { logger } from "@/core/logger";

export function registerLudoHandlers(io: Server): void {
  const ludo = io.of("/ludo");

  ludo.on("connection", (socket) => {
    logger.info("Ludo client connected", { socketId: socket.id });

    // TODO: socket.on("rollDice", ...)
    // TODO: socket.on("movePiece", ...)

    socket.on("disconnect", (reason) => {
      logger.info("Ludo client disconnected", { socketId: socket.id, reason });
    });
  });
}
