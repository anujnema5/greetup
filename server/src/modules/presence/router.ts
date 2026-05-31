import { Hono } from "hono";

import { handleOnlinePeopleCount } from "./controllers/presence.controller";

export const presenceRoute = new Hono();

presenceRoute.get("/online-people-count", handleOnlinePeopleCount);
