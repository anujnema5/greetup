import { Hono } from "hono";
import { handleListRoomEmbeddedActivities } from "./controllers/room-embedded-activities.controller";
import {
  handlePatchRoomTitle,
  handleRoomInvite,
  handleRoomInviteRespond,
  handleGetRoom,
  handleIssueRtcToken,
  handleJoinRoom,
  handleOpenCircleMeeting,
  handleLeaveCircleRtc,
  handleHostEndCircleForEveryone,
  handleStartRoomSession,
} from "./controllers/room.controller";
import { internalRoomsRoute } from "./routes/internal-rooms.route";
import { roomActivityRoute } from "./routes/room-activity.route";

export { internalRoomsRoute };

// Public authenticated route (registered under /api)
export const roomRoute = new Hono();
roomRoute.get("/embedded-activities", handleListRoomEmbeddedActivities);
roomRoute.get("/:roomId/rtc-token", handleIssueRtcToken);
roomRoute.post("/:roomId/join", handleJoinRoom);
roomRoute.post("/:roomId/open-meeting", handleOpenCircleMeeting);
roomRoute.post("/:roomId/leave-circle-rtc", handleLeaveCircleRtc);
roomRoute.post("/:roomId/host-end-circle", handleHostEndCircleForEveryone);
roomRoute.patch("/:roomId/title", handlePatchRoomTitle);
roomRoute.post("/:roomId/start", handleStartRoomSession);
roomRoute.post("/:roomId/invite", handleRoomInvite);
roomRoute.post("/:roomId/invite/respond", handleRoomInviteRespond);
roomRoute.get("/:roomId", handleGetRoom);
roomRoute.route("/", roomActivityRoute);
