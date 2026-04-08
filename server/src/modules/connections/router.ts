import { Hono } from "hono";

import {
  handleDisconnectConnection,
  handleAcceptIncomingConnection,
  handleListMyConnections,
  handlePendingIncomingCount,
  handleRejectIncomingConnection,
  handleRequestConnection,
  handleWithdrawConnectionRequest,
} from "./controllers/connections.controller";

export const connectionsRoute = new Hono();

connectionsRoute.get("/", handleListMyConnections);
connectionsRoute.get("/pending-incoming-count", handlePendingIncomingCount);
connectionsRoute.post("/request", handleRequestConnection);
connectionsRoute.post("/:connectionId/accept", handleAcceptIncomingConnection);
connectionsRoute.post("/:connectionId/reject", handleRejectIncomingConnection);
connectionsRoute.post("/:connectionId/disconnect", handleDisconnectConnection);
connectionsRoute.post("/:connectionId/withdraw", handleWithdrawConnectionRequest);
