import { Hono } from "hono";
import {
  handleCreateRoom,
  handleEnsureProfileSnapshot,
  handleMatchCompleted,
  handleMatchFailed,
  handleMatchProposed,
  handleMatchProposalCancelled,
} from "@/modules/rooms/controllers/room.controller";

/**
 * Internal-only room and matchmaking webhooks.
 */
export const internalRoomsRoute = new Hono();

internalRoomsRoute.post("/rooms/match", handleCreateRoom);
internalRoomsRoute.post("/webhook/ensure-profile-snapshot", handleEnsureProfileSnapshot);
internalRoomsRoute.post("/webhook/match-completed", handleMatchCompleted);
internalRoomsRoute.post("/webhook/match-failed", handleMatchFailed);
internalRoomsRoute.post("/webhook/match-proposed", handleMatchProposed);
internalRoomsRoute.post("/webhook/match-proposal-cancelled", handleMatchProposalCancelled);
