import { Hono } from "hono";
import { handleFindMatch, handleGetMatchResult } from "./controllers/matchmaking.controller";

export const matchmakingRoute = new Hono();

matchmakingRoute.post("/find", handleFindMatch);
matchmakingRoute.get("/result/:requestId", handleGetMatchResult);
