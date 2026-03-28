import { Hono } from "hono";
import { handleCreateRoom, handleMatchCompleted } from "./controllers/room.controller";

export const internalRoomsRoute = new Hono();

internalRoomsRoute.post("/rooms/match", handleCreateRoom);
internalRoomsRoute.post("/webhook/match-completed", handleMatchCompleted);
