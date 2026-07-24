import { Hono } from "hono";

import { handlePostGuestMatchPrep } from "./controllers/guest-match-prep.controller";
import { handlePatchGuestProfile } from "./controllers/guest-profile.controller";
import { handleGetGuestSignupContext } from "./controllers/guest-signup-context.controller";
import { handleGetGuestStatus } from "./controllers/guest-status.controller";

export const guestRoute = new Hono();

// Public via AUTH_OPTIONAL_API_PATHS — session optional; response is booleans only.
guestRoute.get("/signup-context", handleGetGuestSignupContext);
guestRoute.get("/status", handleGetGuestStatus);
guestRoute.patch("/profile", handlePatchGuestProfile);
guestRoute.post("/match-prep", handlePostGuestMatchPrep);
