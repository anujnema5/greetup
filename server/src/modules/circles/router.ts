import { Hono } from "hono";

import { handleCreateCircle, handleListCircleCategories } from "./controllers/circles.controller";

export const circlesRoute = new Hono();

circlesRoute.get("/categories", handleListCircleCategories);
circlesRoute.post("/", handleCreateCircle);
