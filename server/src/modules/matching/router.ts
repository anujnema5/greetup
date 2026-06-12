import { Hono } from "hono";
import {
  requireGuestCallTrialAvailable,
  requireGuestCallTrialForMatchConnect,
} from "@/modules/guest";
import {
  handleFindMatch,
  handleCancelMatch,
  handleLeaveRoom,
  handleRespondMatchProposal,
  handleGetMatchPeerPreview,
} from "./controllers/matchmaking.controller";

export const matchmakingRoute = new Hono();

matchmakingRoute.post("/find", requireGuestCallTrialAvailable, handleFindMatch);
matchmakingRoute.get("/peer-preview/:peerUserId", handleGetMatchPeerPreview);
matchmakingRoute.post("/cancel", handleCancelMatch);
matchmakingRoute.post(
  "/respond",
  requireGuestCallTrialForMatchConnect,
  handleRespondMatchProposal,
);
matchmakingRoute.post("/leave-room", handleLeaveRoom);
