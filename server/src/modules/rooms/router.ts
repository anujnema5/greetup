import { Hono } from "hono";
import {
  handleCreateRoom,
  handleEnsureProfileSnapshot,
  handleGetRoom,
  handleIssueRtcToken,
  handleJoinRoom,
  handleMatchCompleted,
  handleMatchFailed,
  handleStartRoomSession,
} from "./controllers/room.controller";

export const internalRoomsRoute = new Hono();

internalRoomsRoute.post("/rooms/match", handleCreateRoom);
internalRoomsRoute.post("/webhook/ensure-profile-snapshot", handleEnsureProfileSnapshot);
internalRoomsRoute.post("/webhook/match-completed", handleMatchCompleted);
internalRoomsRoute.post("/webhook/match-failed", handleMatchFailed);

// Public authenticated route (registered under /api)
export const roomRoute = new Hono();
roomRoute.get("/:roomId/rtc-token", handleIssueRtcToken);
roomRoute.post("/:roomId/join", handleJoinRoom);
roomRoute.post("/:roomId/start", handleStartRoomSession);
roomRoute.get("/:roomId", handleGetRoom);
