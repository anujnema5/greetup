import { Hono } from "hono";
import { requireGuestCallTrialAvailable } from "@/modules/guest";
import { handleListRoomEmbeddedActivities } from "./controllers/room-embedded-activities.controller";
import {
  handlePatchRoomTitle,
  handleRoomInvite,
  handleRoomInviteRespond,
  handleGetRoom,
  handleIssueRtcToken,
  handleJoinRoom,
  handleOpenSpaceMeeting,
  handleLeaveSpaceRtc,
  handleHostEndSpaceForEveryone,
  handleKickSpaceParticipant,
  handleReportSpaceNsfwViolation,
  handleStartRoomSession,
} from "./controllers/room.controller";
import { internalRoomsRoute } from "./routes/internal-rooms.route";
import { handleGetConversationCues } from "./controllers/conversation-cues.controller";
import { roomActivityRoute } from "./routes/room-activity.route";

export { internalRoomsRoute };

// Public authenticated route (registered under /api)
export const roomRoute = new Hono();
roomRoute.get("/embedded-activities", handleListRoomEmbeddedActivities);
roomRoute.get("/:roomId/rtc-token", requireGuestCallTrialAvailable, handleIssueRtcToken);
roomRoute.post("/:roomId/join", requireGuestCallTrialAvailable, handleJoinRoom);
roomRoute.post("/:roomId/open-meeting", handleOpenSpaceMeeting);
roomRoute.post("/:roomId/leave-space-rtc", handleLeaveSpaceRtc);
roomRoute.post("/:roomId/host-end-space", handleHostEndSpaceForEveryone);
roomRoute.post("/:roomId/kick/:userId", handleKickSpaceParticipant);
roomRoute.post("/:roomId/nsfw-violation", handleReportSpaceNsfwViolation);
roomRoute.patch("/:roomId/title", handlePatchRoomTitle);
roomRoute.post("/:roomId/start", handleStartRoomSession);
roomRoute.post("/:roomId/invite", handleRoomInvite);
roomRoute.post("/:roomId/invite/respond", handleRoomInviteRespond);
roomRoute.get("/:roomId", handleGetRoom);
roomRoute.get("/:roomId/conversation-cues", handleGetConversationCues);
roomRoute.route("/", roomActivityRoute);
