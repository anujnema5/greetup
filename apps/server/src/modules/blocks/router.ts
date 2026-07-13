import { Hono } from "hono";

import { handleBlockUser, handleListBlockedUsers, handleUnblockUser } from "./controllers/blocks.controller";

export const blocksRoute = new Hono();

blocksRoute.get("/", handleListBlockedUsers);
blocksRoute.post("/", handleBlockUser); 
blocksRoute.delete("/:targetUserId", handleUnblockUser);
