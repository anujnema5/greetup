import { Hono } from "hono";
import { profileRoute } from "./profile/router";
import { matchmakingRoute } from "./matching/router";
import { authMiddleware } from "@/middleware";

const router = new Hono();

router.use(authMiddleware);
router.route("/profile", profileRoute);
router.route("/matching", matchmakingRoute);

export default router;