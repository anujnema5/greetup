/**
 * rtc-service bootstrap — HTTP (`createApp`) + Socket.IO + Redis + mediasoup worker.
 */

import { serve } from "@hono/node-server";
import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";
import createApp from "@/http/create-app";
import { APP_CONFIG } from "@/shared/constants";
import { logger } from "@/core/logging";
import { connectRedis, disconnectRedis } from "@/core/redis/client";
import { initializeMediasoup } from "@/core/mediasoup/mediasoup.service";
import { registerRtcSocketAuth } from "@/middleware/socket-jwt.middleware";
import { registerSignalingHandlers } from "@/modules/signaling/signaling.handler";
import { registerInternalPeers } from "@/modules/internal/internal-peers.registry";

const app = createApp();

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

  setupShutdownHooks(io);

  logger.info(`rtc-service listening on http://${APP_CONFIG.host}:${APP_CONFIG.port}`);
};

bootstrap().catch((error) => {
  logger.error("Failed to start rtc-service", { error: String(error) });
  process.exit(1);
});
