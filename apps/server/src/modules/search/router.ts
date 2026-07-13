import { Hono } from "hono";

import { handleSearchUsers } from "./controllers/search.controller";
import { handleSuggestPeople } from "./controllers/suggest-people.controller";

export const searchRoute = new Hono();

searchRoute.get("/users", handleSearchUsers);
searchRoute.get("/suggested-people", handleSuggestPeople);
