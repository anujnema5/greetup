/**
 * HTTP application — mirrors main `server` `http/create-app` pattern.
 */

import { Hono } from "hono";
import { handleRoomRoomType, handleRoomSfuTeardown } from "@/modules/internal/internal.controller";
import { handleVoiceIQTap, handleVoiceIQTapRelease } from "@/modules/voiceiq/voiceiq.controller";
import { healthHandler } from "@/modules/health/health.controller";
import { internalApiGuard } from "@/middleware/internal-api.middleware";

export function createApp(): Hono {
  const app = new Hono();

  app.get("/health", healthHandler);
  app.use("/internal/*", internalApiGuard);
  app.post("/internal/webhook/room-room-type", handleRoomRoomType);
  app.post("/internal/webhook/room-sfu-teardown", handleRoomSfuTeardown);
  app.post("/internal/voiceiq/tap", handleVoiceIQTap);
  app.delete("/internal/voiceiq/tap/:tapId", handleVoiceIQTapRelease);

  return app;
}

export default createApp;
