import { serve } from "@hono/node-server";
import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";
import createApp from "@/http/create-app";
import { APP_CONFIG } from "@/shared/constants";
import { logger } from "@/core/logging";
import { connectRedis, disconnectRedis } from "@/core/redis/client";
import { initializeMediasoup, shutdownMediasoup } from "@/core/mediasoup/mediasoup.service";
import { registerRtcSocketAuth } from "@/middleware/socket-jwt.middleware";
import { registerSignalingHandlers } from "@/modules/rtc/signaling/io-signaling";
import { registerInternalPeers } from "@/modules/rtc/internal/global-peer-session";

const app = createApp();

const setupShutdownHooks = (io: Server, httpServer: HttpServer): void => {
  const shutdown = async () => {
    io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await shutdownMediasoup();
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

  httpServer.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      logger.error(
        `Port ${APP_CONFIG.port} is already in use — stop the other rtc-service instance first`,
        { port: APP_CONFIG.port },
      );
    } else {
      logger.error("HTTP server error", { error: String(error) });
    }
    process.exit(1);
  });

  httpServer.on("listening", () => {
    logger.info(`rtc-service listening on http://${APP_CONFIG.host}:${APP_CONFIG.port}`);
  });

  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  registerRtcSocketAuth(io);
  const peers = registerSignalingHandlers(io);
  registerInternalPeers(peers);

  setupShutdownHooks(io, httpServer);
};

bootstrap().catch((error) => {
  logger.error("Failed to start rtc-service", { error: String(error) });
  process.exit(1);
});
