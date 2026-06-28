import { Hono } from "hono";

import {
  handleCancelConnectRequest,
  handleCreateConnectRequest,
  handleListInboundConnectRequests,
  handleListOutboundConnectRequests,
  handleRespondConnectRequest,
} from "./controllers/connect-requests.controller";

export const connectRequestsRoute = new Hono();

connectRequestsRoute.post("/", handleCreateConnectRequest);
connectRequestsRoute.get("/inbound", handleListInboundConnectRequests);
connectRequestsRoute.get("/outbound", handleListOutboundConnectRequests);
connectRequestsRoute.post("/:id/respond", handleRespondConnectRequest);
connectRequestsRoute.post("/:id/cancel", handleCancelConnectRequest);
