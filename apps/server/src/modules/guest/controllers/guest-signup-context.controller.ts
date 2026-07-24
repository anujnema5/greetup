import type { Context } from "hono";

import logger from "@/core/logging";
import { ApiResponse, internalError } from "@/shared/responses";

import { recordGuestSignupStartedOnce } from "../services/session/record-guest-signup-started.service";
import { resolveGuestSignupMergeContext } from "../services/session/resolve-guest-signup-merge-context.service";
import type { GuestSignupContextApiResponse } from "../types/guest-signup.types";

/**
 * GET /guest/signup-context?from=guest
 * Auth-optional (see AUTH_OPTIONAL_API_PATHS). Lets the register page know a guest
 * session can be merged on signup.
 *
 * Security: response is booleans only — never returns userId, displayName, or hashes.
 * Merge eligibility still requires a valid guest session cookie (validated server-side).
 */
export const handleGetGuestSignupContext = async (c: Context) => {
  try {
    const fromGuestIntent = c.req.query("from") === "guest";
    const mergeContext = await resolveGuestSignupMergeContext(c.req.raw.headers);

    if (mergeContext && fromGuestIntent) {
      await recordGuestSignupStartedOnce(mergeContext, {
        source: "signup_context_endpoint",
      });
    }

    // Explicit boolean projection — do not spread mergeContext into the response.
    const data: GuestSignupContextApiResponse = {
      hasGuestSession: mergeContext != null,
      mergeAvailable: mergeContext != null,
      trialConsumed: mergeContext != null ? mergeContext.trialConsumed : false,
      fromGuestIntent,
    };

    return c.json(ApiResponse.success(data, "Guest signup context", 200), 200);
  } catch (error: unknown) {
    logger.error("get_guest_signup_context_failed", { error });
    return internalError(c, error, "GUEST_SIGNUP_CONTEXT_FAILED");
  }
};
