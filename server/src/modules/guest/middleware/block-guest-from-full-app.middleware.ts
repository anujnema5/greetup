import { GuestNotAllowedError } from "@/shared/errors";
import type { Context, Next } from "hono";

/** Blocks all routes on the mounted subtree for guest accounts. */
export const blockGuestFromFullApp = async (c: Context, next: Next) => {
  if (c.get("isGuest")) {
    throw new GuestNotAllowedError();
  }
  await next();
};
