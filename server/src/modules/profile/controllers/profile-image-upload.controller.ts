import type { Context } from "hono";

import { presignProfileImageUpload } from "@/core/storage";
import logger from "@/core/logging";
import { AppError } from "@/shared/errors";
import { ApiResponse, internalError } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";
import { presignProfileImageBodySchema } from "../schemas/profile-image-upload.schema";

export const handlePresignProfileImageUpload = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const body = await c.req.json();
    const parsed = presignProfileImageBodySchema.safeParse(body);

    if (!parsed.success) {
      const errors = zodFieldErrorsItems(parsed.error);
      return c.json(
        ApiResponse.error({
          message: "Invalid request body",
          statusCode: 400,
          code: "VALIDATION_ERROR",
          errors,
        }),
        400
      );
    }

    const result = await presignProfileImageUpload({
      userId,
      contentType: parsed.data.contentType,
    });

    return c.json(
      ApiResponse.success(
        {
          uploadUrl: result.uploadUrl,
          publicUrl: result.publicUrl,
          key: result.key,
          expiresIn: result.expiresIn,
          contentType: result.contentType,
        },
        "Upload URL created",
        200
      ),
      200
    );
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Presign profile image error", { error });
    return internalError(c, error, "PRESIGN_PROFILE_IMAGE_FAILED");
  }
};
