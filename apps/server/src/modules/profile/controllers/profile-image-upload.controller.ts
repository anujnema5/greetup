import type { Context } from "hono";

import {
  ensureProfileImageUrlsArePublic,
  assertUploadedImageObjectAllowed,
  parseLocalObjectKeyFromPublicUrl,
  parseSpacesObjectKeyFromPublicUrl,
  presignProfileImageUpload,
  verifyProfileImageKeyForUser,
} from "@/core/storage";
import logger from "@/core/logging";
import { AppError } from "@/shared/errors";
import { ApiResponse, internalError } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";
import {
  ensureProfilePhotoPublicBodySchema,
  presignProfileImageBodySchema,
} from "../schemas/profile-image-upload.schema";

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
      contentLength: parsed.data.contentLength,
    });

    return c.json(
      ApiResponse.success(
        {
          uploadUrl: result.uploadUrl,
          publicUrl: result.publicUrl,
          key: result.key,
          expiresIn: result.expiresIn,
          contentType: result.contentType,
          uploadHeaders: result.uploadHeaders,
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

/** After browser PUT to Spaces, apply public-read (ACL or copy) so GET is not AccessDenied. */
export const handleEnsureProfilePhotoPublic = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const body = await c.req.json();
    const parsed = ensureProfilePhotoPublicBodySchema.safeParse(body);

    if (!parsed.success) {
      const errors = zodFieldErrorsItems(parsed.error);
      return c.json(
        ApiResponse.error({
          message: "Invalid request body",
          statusCode: 400,
          code: "VALIDATION_ERROR",
          errors,
        }),
        400,
      );
    }

    const key =
      parseLocalObjectKeyFromPublicUrl(parsed.data.publicUrl) ??
      parseSpacesObjectKeyFromPublicUrl(parsed.data.publicUrl);
    if (!key || !verifyProfileImageKeyForUser(key, userId)) {
      return c.json(
        ApiResponse.error({
          message: "Not allowed for this image",
          statusCode: 403,
          code: "FORBIDDEN",
        }),
        403,
      );
    }

    await assertUploadedImageObjectAllowed(key);
    if (!parseLocalObjectKeyFromPublicUrl(parsed.data.publicUrl)) {
      await ensureProfileImageUrlsArePublic([parsed.data.publicUrl]);
    }

    return c.json(ApiResponse.success({ ok: true }, "Profile image access updated", 200), 200);
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Ensure profile photo public error", { error });
    return internalError(c, error, "ENSURE_PROFILE_PHOTO_PUBLIC_FAILED");
  }
};
