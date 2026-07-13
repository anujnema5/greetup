import type { Context } from "hono";

import logger from "@/core/logging";
import { AppError } from "@/shared/errors";
import { ApiResponse, internalError } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";

import { guestMatchPrepBodySchema } from "../schemas/guest-match-prep.schema";
import { saveGuestMatchPrep } from "../services/profile/save-guest-match-prep.service";

export const handlePostGuestMatchPrep = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }

    const parsed = guestMatchPrepBodySchema.safeParse(body);
    if (!parsed.success) {
      const errors = zodFieldErrorsItems(parsed.error);
      return c.json(
        ApiResponse.error({
          message: "Invalid body",
          statusCode: 400,
          code: "VALIDATION_ERROR",
          errors,
        }),
        400,
      );
    }

    await saveGuestMatchPrep(userId, parsed.data);
    return c.json(ApiResponse.success({ ok: true }, "Guest match prep saved", 200), 200);
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("post_guest_match_prep_failed", { error });
    return internalError(c, error, "GUEST_MATCH_PREP_SAVE_FAILED");
  }
};
