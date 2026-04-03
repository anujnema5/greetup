import { Hono } from "hono";

import {
  handleCreateCircle,
  handleListActiveCircles,
  handleListCircleCategories,
} from "./controllers/circles.controller";

export const circlesRoute = new Hono();

circlesRoute.get("/active", handleListActiveCircles);
circlesRoute.get("/categories", handleListCircleCategories);
circlesRoute.post("/", handleCreateCircle);
