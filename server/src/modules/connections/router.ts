import { Hono } from "hono";

import {
  handleAcceptIncomingConnection,
  handleListMyConnections,
  handleRejectIncomingConnection,
  handleRequestConnection,
} from "./controllers/connections.controller";

export const connectionsRoute = new Hono();

connectionsRoute.get("/", handleListMyConnections);
connectionsRoute.post("/request", handleRequestConnection);
connectionsRoute.post("/:connectionId/accept", handleAcceptIncomingConnection);
connectionsRoute.post("/:connectionId/reject", handleRejectIncomingConnection);
