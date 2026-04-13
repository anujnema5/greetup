import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { APP_CONFIG } from "@/config/constants";
import { logger } from "@/core/logger";
import { connectRedis, disconnectRedis } from "@/redis/client";
import { initializeMediasoup } from "@/mediasoup/mediasoup.service";
import { registerRtcSocketAuth } from "@/auth/socket-jwt.middleware";
import { registerSignalingHandlers } from "@/signaling/signaling.handler";
import { registerChessHandlers } from "@/games/chess/chess.handler";
import { registerLudoHandlers } from "@/games/ludo/ludo.handler";
import { healthHandler } from "@/controllers/health.controller";
import { handleRoomRoomType } from "@/controllers/internal.controller";
import { registerInternalPeers } from "@/internal/internal-peers.registry";
import { internalApiGuard } from "@/middleware/internal-api.middleware";

const app = new Hono();

app.get("/health", healthHandler);
app.use("/internal/*", internalApiGuard);
app.post("/internal/webhook/room-room-type", handleRoomRoomType);

const setupShutdownHooks = (io: Server): void => {
  const shutdown = async () => {
    io.close();
    await disconnectRedis();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

const bootstrap = async (): Promise<void> => {
  await connectRedis();
  await initializeMediasoup();

  const httpServer = serve({
    fetch: app.fetch,
    port: APP_CONFIG.port,
    hostname: APP_CONFIG.host,
  }) as HttpServer;

  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  registerRtcSocketAuth(io);
  const peers = registerSignalingHandlers(io);
  registerInternalPeers(peers);
  registerChessHandlers(io);
  registerLudoHandlers(io);

  setupShutdownHooks(io);

  logger.info(`rtc-service listening on http://${APP_CONFIG.host}:${APP_CONFIG.port}`);
};

bootstrap().catch((error) => {
  logger.error("Failed to start rtc-service", { error: String(error) });
  process.exit(1);
});
