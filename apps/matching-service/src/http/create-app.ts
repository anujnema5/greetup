/**
 * HTTP app factory — mirrors main `server` / `rtc-service` `http/create-app` pattern.
 */

import { Hono } from "hono";
import { healthResponse } from "@/modules/health/health.controller";
import {
  handleFindMatch,
  handleGetMatchResult,
  handleGetUserMatchState,
  handleCancelMatch,
  handleLeaveRoom,
  handleMatchRespond,
} from "@/modules/simple-matching/match.controller";

export function createApp(): Hono {
  const app = new Hono();

  app.get("/health", healthResponse);
  app.post("/match/find", handleFindMatch);
  app.get("/match/result/:requestId", handleGetMatchResult);
  app.get("/match/state/user/:userId", handleGetUserMatchState);
  app.post("/match/cancel", handleCancelMatch);
  app.post("/match/respond", handleMatchRespond);
  app.post("/match/leave-room", handleLeaveRoom);

  return app;
}

export default createApp;
