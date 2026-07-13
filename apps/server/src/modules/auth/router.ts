import { Hono } from "hono";

import { handleGetSession } from "./controllers/auth-session.controller";

const authPublicRouter = new Hono();

authPublicRouter.get("/get-session", handleGetSession);
authPublicRouter.get("/get-session/", handleGetSession);

export { authPublicRouter };
