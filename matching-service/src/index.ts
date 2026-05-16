/**
 * matching-service bootstrap — HTTP (`createApp`) + Redis + match worker.
 */

import { APP_CONFIG } from "@/shared/config/constants";
import createApp from "@/http/create-app";
import { logger } from "@/core/logging";
import { connectRedis, disconnectRedis } from "@/core/redis/client";
import { MatchWorkerService } from "@/modules/simple-matching/worker";

const app = createApp();
const matchmakingWorker = new MatchWorkerService();

const setupShutdownHooks = (): void => {
  const shutdown = async () => {
    matchmakingWorker.stop();
    await disconnectRedis();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

const bootstrap = async (): Promise<void> => {
  await connectRedis();
  matchmakingWorker.start();
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
