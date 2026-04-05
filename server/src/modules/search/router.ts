import { Hono } from "hono";

import { handleSearchUsers } from "./controllers/search.controller";

export const searchRoute = new Hono();

searchRoute.get("/users", handleSearchUsers);
