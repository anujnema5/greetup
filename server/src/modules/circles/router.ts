import { Hono } from "hono";

import {
  handleListBrowseNicheRooms,
  handleListBrowseNiches,
} from "./controllers/browse-niches.controller";
import {
  handleCreateCircle,
  handleDeleteScheduledCircle,
  handleListActiveCircles,
  handleListCircleCategories,
  handlePatchScheduledCircle,
} from "./controllers/circles.controller";

export const circlesRoute = new Hono();

circlesRoute.get("/active", handleListActiveCircles);
circlesRoute.get("/browse/niches", handleListBrowseNiches);
circlesRoute.get("/browse/niches/:categoryId/rooms", handleListBrowseNicheRooms);
circlesRoute.get("/categories", handleListCircleCategories);
circlesRoute.post("/", handleCreateCircle);
circlesRoute.patch("/:roomId", handlePatchScheduledCircle);
circlesRoute.delete("/:roomId", handleDeleteScheduledCircle);
