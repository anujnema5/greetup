import { Hono } from "hono";

import {
  handleDisableOpenToConnect,
  handleEnableOpenToConnect,
  handleGetOpenToConnectFeed,
  handleGetOpenToConnectMe,
  handleGetOpenToConnectSearchSuggestions,
  handleGetOpenToConnectSidebar,
} from "./controllers/open-to-connect.controller";

export const openToConnectRoute = new Hono();

openToConnectRoute.get("/me", handleGetOpenToConnectMe);
openToConnectRoute.get("/feed", handleGetOpenToConnectFeed);
openToConnectRoute.get("/sidebar", handleGetOpenToConnectSidebar);
openToConnectRoute.get("/suggestions-for-search", handleGetOpenToConnectSearchSuggestions);
openToConnectRoute.post("/enable", handleEnableOpenToConnect);
openToConnectRoute.post("/disable", handleDisableOpenToConnect);
