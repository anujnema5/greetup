import { Hono } from "hono";
import {
  handleChessEnd,
  handleChessInvite,
  handleChessRespond,
} from "@/modules/rooms/controllers/room-activity.controller";

/**
 * Public authenticated in-room activity actions.
 * Mounted under `/api/room`.
 */
export const roomActivityRoute = new Hono();

roomActivityRoute.post("/:roomId/activity/chess/invite", handleChessInvite);
roomActivityRoute.post("/:roomId/activity/chess/respond", handleChessRespond);
roomActivityRoute.post("/:roomId/activity/chess/end", handleChessEnd);
