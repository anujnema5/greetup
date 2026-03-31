import { Hono } from "hono";
import { handleFindMatch, handleCancelMatch, handleLeaveRoom } from "./controllers/matchmaking.controller";

export const matchmakingRoute = new Hono();

matchmakingRoute.post("/find", handleFindMatch);
matchmakingRoute.post("/cancel", handleCancelMatch);
matchmakingRoute.post("/leave-room", handleLeaveRoom);
