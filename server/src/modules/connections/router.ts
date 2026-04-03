import { Hono } from "hono";

import { handleListMyConnections } from "./controllers/connections.controller";

export const connectionsRoute = new Hono();

connectionsRoute.get("/", handleListMyConnections);
