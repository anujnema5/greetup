import { Hono } from "hono";
import { connectionsRoute } from "./connections/router";
import { spacesRoute } from "./spaces/router";
import { profileRoute } from "./profile/router";
import { matchmakingRoute } from "./matching/router";
import { roomRoute } from "./rooms/router";
import { searchRoute } from "./search/router";
import { notificationsRoute } from "./notifications/router";
import { chatRoute } from "./chat/router";
import { blocksRoute } from "./blocks/router";
import { presenceRoute } from "./presence/router";
import { problemReportsRoute } from "./problem-reports/router";
import { openToConnectRoute } from "./open-to-connect/router";
import { connectRequestsRoute } from "./open-to-connect/connect-requests.router";
import {
  blockGuestFromFullApp,
  blockGuestFromProfileRoutes,
  guestRoute,
} from "./guest";
import { authMiddleware, requireAllowedOrigin } from "@/middleware";

const router = new Hono();

router.use(authMiddleware);
router.use(requireAllowedOrigin);

router.use("/profile/*", blockGuestFromProfileRoutes);
router.use("/connections/*", blockGuestFromFullApp);
router.use("/spaces/*", blockGuestFromFullApp);
router.use("/search/*", blockGuestFromFullApp);
router.use("/notifications/*", blockGuestFromFullApp);
router.use("/chat/*", blockGuestFromFullApp);
router.use("/blocks/*", blockGuestFromFullApp);
router.use("/presence/*", blockGuestFromFullApp);
router.use("/open-to-connect/*", blockGuestFromFullApp);
router.use("/connect-requests/*", blockGuestFromFullApp);

router.route("/profile", profileRoute);
router.route("/connections", connectionsRoute);
router.route("/spaces", spacesRoute);
router.route("/matching", matchmakingRoute);
router.route("/room", roomRoute);
router.route("/search", searchRoute);
router.route("/notifications", notificationsRoute);
router.route("/chat", chatRoute);
router.route("/blocks", blocksRoute);
router.route("/presence", presenceRoute);
router.route("/open-to-connect", openToConnectRoute);
router.route("/connect-requests", connectRequestsRoute);
router.route("/problem-reports", problemReportsRoute);
router.route("/guest", guestRoute);

export default router;