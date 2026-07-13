import type { Context } from "hono";

import logger from "@/core/logging";
import { ApiResponse, internalError } from "@/shared/responses";

import { getPublicProfileByUsername } from "../services/get-public-profile.service";

export const handleGetPublicProfile = async (c: Context) => {
  try {
    const viewerId = c.get("userId") as string;
    const username = c.req.param("username");
    if (!username?.trim()) {
      return c.json(
        ApiResponse.error({
          message: "username is required",
          statusCode: 400,
          code: "VALIDATION_ERROR",
        }),
        400,
      );
    }

    const profile = await getPublicProfileByUsername(viewerId, username);
    if (!profile) {
      return c.json(
        ApiResponse.error({
          message: "Profile not found",
          statusCode: 404,
          code: "NOT_FOUND",
        }),
        404,
      );
    }

    return c.json(ApiResponse.success(profile, "OK", 200), 200);
  } catch (error: unknown) {
    logger.error("Get public profile error", { error });
    return internalError(c, error, "GET_PUBLIC_PROFILE_FAILED");
  }
};
