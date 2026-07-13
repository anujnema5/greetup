import { GuestTrialExhaustedError } from "@/shared/errors";
import type { Context, Next } from "hono";

/**
 * Like `requireGuestCallTrialAvailable`, but allows `decision: "skip"` on match respond
 * so guests can decline proposals without starting a new call.
 */
export const requireGuestCallTrialForMatchConnect = async (c: Context, next: Next) => {
  if (!c.get("isGuest") || !c.get("guestTrialConsumed")) {
    await next();
    return;
  }

  try {
    const body = (await c.req.raw.clone().json()) as { decision?: string };
    if (body.decision === "skip") {
      await next();
      return;
    }
  } catch {
    // Invalid body — let controller return 400.
  }

  throw new GuestTrialExhaustedError();
};
