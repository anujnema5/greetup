import { GuestNotAllowedError } from "@/shared/errors";
import type { Context, Next } from "hono";

import { isGuestAllowedProfileRequest } from "../lib/guest-allowed-profile-routes";

/**
 * Guests may only read shared match-prep lookup options from profile routes.
 * All other profile APIs use `/guest/*` or require a full account.
 */
export const blockGuestFromProfileRoutes = async (c: Context, next: Next) => {
  if (!c.get("isGuest")) {
    await next();
    return;
  }

  if (isGuestAllowedProfileRequest(c.req.method, c.req.path)) {
    await next();
    return;
  }

  throw new GuestNotAllowedError();
};
