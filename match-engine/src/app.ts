import { APP_CONFIG } from "@/config/constants";
import { healthResponse } from "@/controllers/health.controller";
import { handleFindMatch, handleGetMatchResult } from "@/controllers/matchmaking.controller";
import { logger } from "@/core/logger";
import { connectRedis, disconnectRedis } from "@/redis/client";
import { MatchWorkerService } from "@/matchmaking/application/match-worker.service";

const worker = new MatchWorkerService();

const setupShutdownHooks = (): void => {
  const shutdown = async () => {
    worker.stop();
    await disconnectRedis();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

const bootstrap = async (): Promise<void> => {
  await connectRedis();
  worker.start();
  setupShutdownHooks();

  logger.info(`Starting matching-service on http://${APP_CONFIG.host}:${APP_CONFIG.port}`);
  
  const server = Bun.serve({
    port: APP_CONFIG.port,
    hostname: APP_CONFIG.host,
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url);

      if (url.pathname === "/health") {
        return healthResponse();
      }

      if (request.method === "POST" && url.pathname === "/match/find") {
        return handleFindMatch(request);
      }

      if (request.method === "GET" && url.pathname.startsWith("/match/result/")) {
        const requestId = decodeURIComponent(url.pathname.replace("/match/result/", ""));
        return handleGetMatchResult(requestId);
      }

      return new Response("Matching Service", { status: 200 });
    },
  });

  logger.info(`matching-service listening on http://${server.hostname}:${server.port}`);
};

bootstrap().catch((error) => {
  logger.error("Failed to start matching-service", { error: String(error) });
  process.exit(1);
});
