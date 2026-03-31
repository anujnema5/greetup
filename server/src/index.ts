import { serve } from "@hono/node-server";

import { registerEventListeners } from "@/core/events/listeners";
import logger from "@/core/logging";
import { initSocket, setupSocketAdapter } from "@/core/socket";
import createApp from "@/http/create-app";
import config from "@/shared/config/config";

const startServer = async () => {
  const app = await createApp();

  const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
    logger.info(`Server listening at http://localhost:${info.port}`);
  });

  const io = initSocket();
  io.attach(server);
  setupSocketAdapter();
  registerEventListeners();
};

await startServer();
