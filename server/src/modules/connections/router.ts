import { Hono } from "hono";

import {
  handleCancelConnectionCall,
  handleInitiateConnectionCall,
  handleMarkConnectionCallMissed,
  handleRespondConnectionCall,
} from "./controllers/connection-call.controller";
import {
  handleDisconnectConnection,
  handleAcceptIncomingConnection,
  handleListMyConnections,
  handlePeersCallStatus,
  handlePendingIncomingCount,
  handleRejectIncomingConnection,
  handleRequestConnection,
  handleWithdrawConnectionRequest,
} from "./controllers/connections.controller";

export const connectionsRoute = new Hono();

connectionsRoute.get("/", handleListMyConnections);
connectionsRoute.get("/pending-incoming-count", handlePendingIncomingCount);
connectionsRoute.post("/peers-call-status", handlePeersCallStatus);
connectionsRoute.post("/calls", handleInitiateConnectionCall);
connectionsRoute.post("/calls/:requestId/respond", handleRespondConnectionCall);
connectionsRoute.post("/calls/:requestId/cancel", handleCancelConnectionCall);
connectionsRoute.post("/calls/:requestId/missed", handleMarkConnectionCallMissed);
connectionsRoute.post("/request", handleRequestConnection);
connectionsRoute.post("/:connectionId/accept", handleAcceptIncomingConnection);
connectionsRoute.post("/:connectionId/reject", handleRejectIncomingConnection);
connectionsRoute.post("/:connectionId/disconnect", handleDisconnectConnection);
connectionsRoute.post("/:connectionId/withdraw", handleWithdrawConnectionRequest);
