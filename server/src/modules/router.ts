import { Hono } from "hono";
import { profileRoute } from "./profile/router";
import { authMiddleware } from "@/middleware";

const router = new Hono();

router.use(authMiddleware)
router.route("/profile", profileRoute)

export default router;