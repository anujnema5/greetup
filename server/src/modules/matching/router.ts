import { Hono } from "hono";
import {
  handleFindMatch,
  handleCancelMatch,
  handleLeaveRoom,
  handleRespondMatchProposal,
  handleGetMatchPeerPreview,
} from "./controllers/matchmaking.controller";

export const matchmakingRoute = new Hono();

matchmakingRoute.post("/find", handleFindMatch);
matchmakingRoute.get("/peer-preview/:peerUserId", handleGetMatchPeerPreview);
matchmakingRoute.post("/cancel", handleCancelMatch);
matchmakingRoute.post("/respond", handleRespondMatchProposal);
matchmakingRoute.post("/leave-room", handleLeaveRoom);
