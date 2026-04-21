import type { WebSocketData } from "@socket.io/bun-engine";

import { loadAEKs } from "@/core/crypto/aek-loader";
import { registerEventListeners } from "@/core/events/listeners";
import logger from "@/core/logging";
import { isSocketIoRequestPath, wireBunSocketIo } from "@/core/socket";
import createApp from "@/http/create-app";
import config from "@/shared/config/config";
import { runMigrations } from "@/core/database/run-migrations";
import { db } from "@/core/database";
import { upsertOnboardingLookups } from "@/core/database/seed/upsert-onboarding-lookups";

// AEK must be loaded before anything that touches crypto
await loadAEKs();
await runMigrations();
await upsertOnboardingLookups(db);
logger.info("[seed] Onboarding lookups upserted.");

const app = await createApp();
const engine = wireBunSocketIo();
registerEventListeners();

const { websocket, idleTimeout, maxRequestBodySize } = engine.handler();

logger.info(`Server listening at http://localhost:${config.port}`);

export default {
  port: config.port,
  hostname: config.listenHost,
  idleTimeout,
  maxRequestBodySize,
  development: config.env !== "production",
  fetch(req: Request, server: Bun.Server<WebSocketData>) {
    return isSocketIoRequestPath(new URL(req.url).pathname)
      ? engine.handleRequest(req, server)
      : app.fetch(req);
  },
  websocket,
};
