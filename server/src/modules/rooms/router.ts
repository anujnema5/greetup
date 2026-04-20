import { Hono } from "hono";
import {
  handleExpandDirectInvite,
  handleExpandDirectRespond,
  handleGetRoom,
  handleIssueRtcToken,
  handleJoinRoom,
  handleStartRoomSession,
} from "./controllers/room.controller";
import { internalRoomsRoute } from "./routes/internal-rooms.route";
import { roomActivityRoute } from "./routes/room-activity.route";

export { internalRoomsRoute };

// Public authenticated route (registered under /api)
export const roomRoute = new Hono();
roomRoute.get("/:roomId/rtc-token", handleIssueRtcToken);
roomRoute.post("/:roomId/join", handleJoinRoom);
roomRoute.post("/:roomId/start", handleStartRoomSession);
roomRoute.post("/:roomId/expand-direct/invite", handleExpandDirectInvite);
roomRoute.post("/:roomId/expand-direct/respond", handleExpandDirectRespond);
roomRoute.get("/:roomId", handleGetRoom);
roomRoute.route("/", roomActivityRoute);
