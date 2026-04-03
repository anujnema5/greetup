import { Hono } from "hono";
import { cors } from "hono/cors";

import { auth } from "@/core/auth/auth";
import { setupRedis } from "@/core/redis";
import { errorHandler, internalMiddleware } from "@/middleware";
import { apiRouter, internalRoomsRoute } from "@/modules";
import { REDIS_URL } from "@/shared/constants";

import { corsOptions } from "./cors";
import { HTTP_PATHS } from "./paths";

/**
 * Builds the HTTP application: Redis, CORS, Better Auth, `/api`, `/internal`, health, global errors.
 */
const createApp = async () => {
  await setupRedis(REDIS_URL);

  const app = new Hono();

  app.use(cors(corsOptions));

  app.all(HTTP_PATHS.authGlob, (c) => auth.handler(c.req.raw));

  app.route(HTTP_PATHS.api, apiRouter);

  app.use(`${HTTP_PATHS.internal}/*`, internalMiddleware);
  app.route(HTTP_PATHS.internal, internalRoomsRoute);

  app.get(HTTP_PATHS.root, (c) => c.json({ message: "Circlo Hono!" }));

  app.onError(errorHandler);

  return app;
};

export default createApp;