import { Hono } from "hono";

import {
  handleListBrowseNicheRooms,
  handleListBrowseNiches,
} from "./controllers/browse-niches.controller";
import {
  handleCreateSpace,
  handleDeleteScheduledSpace,
  handleListActiveSpaces,
  handleListSpaceCategories,
  handlePatchScheduledSpace,
} from "./controllers/spaces.controller";

export const spacesRoute = new Hono();

spacesRoute.get("/active", handleListActiveSpaces);
spacesRoute.get("/browse/niches", handleListBrowseNiches);
spacesRoute.get("/browse/niches/:categoryId/rooms", handleListBrowseNicheRooms);
spacesRoute.get("/categories", handleListSpaceCategories);
spacesRoute.post("/", handleCreateSpace);
spacesRoute.patch("/:roomId", handlePatchScheduledSpace);
spacesRoute.delete("/:roomId", handleDeleteScheduledSpace);
