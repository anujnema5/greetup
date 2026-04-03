import { Hono } from "hono";
import { connectionsRoute } from "./connections/router";
import { circlesRoute } from "./circles/router";
import { profileRoute } from "./profile/router";
import { matchmakingRoute } from "./matching/router";
import { roomRoute } from "./rooms/router";
import { authMiddleware } from "@/middleware";

const router = new Hono();

router.use(authMiddleware);
router.route("/profile", profileRoute);
router.route("/connections", connectionsRoute);
router.route("/circles", circlesRoute);
router.route("/matching", matchmakingRoute);
router.route("/room", roomRoute);

export default router;