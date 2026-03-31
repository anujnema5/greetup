import { Hono } from "hono";
import {
  handleCreateRoom,
  handleEnsureProfileSnapshot,
  handleGetRoom,
  handleMatchCompleted,
  handleMatchFailed,
} from "./controllers/room.controller";

export const internalRoomsRoute = new Hono();

internalRoomsRoute.post("/rooms/match", handleCreateRoom);
internalRoomsRoute.post("/webhook/ensure-profile-snapshot", handleEnsureProfileSnapshot);
internalRoomsRoute.post("/webhook/match-completed", handleMatchCompleted);
internalRoomsRoute.post("/webhook/match-failed", handleMatchFailed);

// Public authenticated route (registered under /api)
export const roomRoute = new Hono();
roomRoute.get("/:roomId", handleGetRoom);
