import { Hono } from "hono";
import { connectionsRoute } from "./connections/router";
import { circlesRoute } from "./circles/router";
import { profileRoute } from "./profile/router";
import { matchmakingRoute } from "./matching/router";
import { roomRoute } from "./rooms/router";
import { searchRoute } from "./search/router";
import { notificationsRoute } from "./notifications/router";
import { chatRoute } from "./chat/router";
import { blocksRoute } from "./blocks/router";
import { authMiddleware } from "@/middleware";

const router = new Hono();

router.use(authMiddleware);
router.route("/profile", profileRoute);
router.route("/connections", connectionsRoute);
router.route("/circles", circlesRoute);
router.route("/matching", matchmakingRoute);
router.route("/room", roomRoute);
router.route("/search", searchRoute);
router.route("/notifications", notificationsRoute);
router.route("/chat", chatRoute);
router.route("/blocks", blocksRoute);

export default router;