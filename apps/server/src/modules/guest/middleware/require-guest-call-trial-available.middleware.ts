import { GuestTrialExhaustedError } from "@/shared/errors";
import type { Context, Next } from "hono";

/** Blocks guests who already used their one free call (new match / join / RTC). */
export const requireGuestCallTrialAvailable = async (c: Context, next: Next) => {
  if (c.get("isGuest") && c.get("guestTrialConsumed")) {
    throw new GuestTrialExhaustedError();
  }
  await next();
};
