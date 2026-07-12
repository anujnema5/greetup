import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

import { auth } from "@/core/auth/auth";
import { handleAuthWithOAuthDiagnostics } from "@/core/auth/oauth-diagnostics";
import { setupRedis } from "@/core/redis";
import { errorHandler, internalMiddleware } from "@/middleware";
import { apiRouter, authPublicRouter, internalRoomsRoute } from "@/modules";
import { REDIS_URL } from "@/shared/constants";

import { corsOptions } from "./cors";
import { HTTP_PATHS } from "./paths";

/**
 * Builds the HTTP application: Redis, CORS, Better Auth, `/api`, `/internal`, health, global errors.
 */
const createApp = async () => {
  await setupRedis(REDIS_URL);

  const app = new Hono();

  app.use(
    "*",
    secureHeaders({
      xFrameOptions: "DENY",
      xContentTypeOptions: "nosniff",
      referrerPolicy: "strict-origin-when-cross-origin",
      // API returns JSON; browser CSP lives on the Next app.
      strictTransportSecurity: false,
    }),
  );

  // API host should not appear in search results (api.greetup.co).
  app.use("*", async (c, next) => {
    await next();
    c.header("X-Robots-Tag", "noindex, nofollow, noarchive");
  });

  app.get("/robots.txt", (c) =>
    c.text("User-agent: *\nDisallow: /\n", 200, {
      "Content-Type": "text/plain; charset=utf-8",
    }),
  );

  app.use(cors(corsOptions));

  app.route(HTTP_PATHS.auth, authPublicRouter);
  app.all(HTTP_PATHS.authGlob, (c) =>
    handleAuthWithOAuthDiagnostics(c.req.raw, (request) => auth.handler(request)),
  );

  app.route(HTTP_PATHS.api, apiRouter);

  app.use(`${HTTP_PATHS.internal}/*`, internalMiddleware);
  app.route(HTTP_PATHS.internal, internalRoomsRoute);

  app.get(HTTP_PATHS.root, (c) => c.json({ message: "Hi Greetup!" }));

  app.onError(errorHandler);

  return app;
};

export default createApp;
