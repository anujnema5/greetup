import type { Context } from "hono";

import logger from "@/core/logging";
import { AppError } from "@/shared/errors";
import { ApiResponse, internalError } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";

import { patchGuestProfileBodySchema } from "../schemas/guest-profile.schema";
import { updateGuestDisplayName } from "../services/profile/update-guest-display-name.service";

export const handlePatchGuestProfile = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }

    const parsed = patchGuestProfileBodySchema.safeParse(body);
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

    const result = await updateGuestDisplayName(userId, parsed.data.displayName);
    return c.json(
      ApiResponse.success({ displayName: result.displayName }, "Guest profile updated", 200),
      200,
    );
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("patch_guest_profile_failed", { error });
    return internalError(c, error, "GUEST_PROFILE_UPDATE_FAILED");
  }
};
