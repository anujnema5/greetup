import { Hono } from "hono";
import { APP_CONFIG } from "@/config/constants";
import { healthResponse } from "@/controllers/health.controller";
import { handleFindMatch, handleGetMatchResult } from "@/controllers/matchmaking.controller";
import { logger } from "@/core/logger";
import { connectRedis, disconnectRedis } from "@/redis/client";
import { MatchWorkerService } from "@/matchmaking/application/match-worker.service";

const worker = new MatchWorkerService();

const app = new Hono();

app.get("/health", healthResponse);
app.post("/match/find", handleFindMatch);
app.get("/match/result/:requestId", handleGetMatchResult);

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

  logger.info(`matching-service listening on http://${APP_CONFIG.host}:${APP_CONFIG.port}`);
};

bootstrap().catch((error) => {
  logger.error("Failed to start matching-service", { error: String(error) });
  process.exit(1);
});

export default {
  port: APP_CONFIG.port,
  hostname: APP_CONFIG.host,
  fetch: app.fetch,
};
