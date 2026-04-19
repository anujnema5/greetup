import { Hono } from "hono";

import { handleGetSession } from "./controllers/auth-session.controller";

export const authRoute = new Hono();

authRoute.get("/get-session", handleGetSession);
authRoute.get("/get-session/", handleGetSession);