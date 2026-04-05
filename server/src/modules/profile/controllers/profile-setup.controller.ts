import type { Context } from "hono";

import logger from "@/core/logging";
import { ApiResponse, internalError } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";
import { fetchProfileStepsService } from "../services/profile-steps.service";
import { saveProfileSetupStepService } from "../services/profile-setup-save.service";
import { getOnboardingStatusService } from "../services/onboarding-status.service";
import {
  fetchProfileStepsQuerySchema,
  saveProfileSetupBodySchema,
} from "../schemas/profile-setup.schema";
import { getMyProfileService } from "../services/get-my-profile.service";
import { UsernameTakenError } from "../repositories/profile-setup.repository";
import {
  RoomInviteAllowlistNotConnectionError,
  updateRoomInviteSettingsService,
} from "../services/room-invite-preferences.service";
import { roomInviteSettingsBodySchema } from "../schemas/room-invite-preferences.schema";

export const handleGetMyProfile = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const profile = await getMyProfileService(userId);
    if (!profile) {
      return c.json(
        ApiResponse.error({
          message: "Profile not found",
          statusCode: 404,
          code: "PROFILE_NOT_FOUND",
        }),
        404
      );
    }
    return c.json(ApiResponse.success(profile, "Profile retrieved", 200), 200);
  } catch (error: unknown) {
    logger.error("Get my profile error", { error });
    return internalError(c, error, "GET_PROFILE_FAILED");
  }
};

export const handleGetOnboardingStatus = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const result = await getOnboardingStatusService(userId);
    return c.json(
      ApiResponse.success(result, "Onboarding status retrieved", 200),
      200
    );
  } catch (error: unknown) {
    logger.error("Get onboarding status error", { error });
    return internalError(c, error, "ONBOARDING_STATUS_FAILED");
  }
};

export const handleSaveProfileSetup = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const body = await c.req.json();
    const parsed = saveProfileSetupBodySchema.safeParse(body);

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

    const result = await saveProfileSetupStepService({
      userId,
      body: parsed.data,
    });

    return c.json(
      ApiResponse.success(
        {
          profileCompletion: result.profileCompletion,
          isProfileComplete: result.isProfileComplete,
          isOnboarded: result.isProfileComplete,
        },
        "Profile step saved successfully",
        200
      ),
      200
    );
  } catch (error: unknown) {
    if (error instanceof UsernameTakenError) {
      return c.json(
        ApiResponse.error({
          message: "This username is already taken",
          statusCode: 409,
          code: "USERNAME_TAKEN",
        }),
        409,
      );
    }
    logger.error("Save profile setup error", { error });
    return internalError(c, error, "SAVE_PROFILE_SETUP_FAILED");
  }
};

export const handleUpdateRoomInviteSettings = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const body = await c.req.json();
    const parsed = roomInviteSettingsBodySchema.safeParse(body);
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

    try {
      const data = await updateRoomInviteSettingsService(userId, parsed.data);
      return c.json(ApiResponse.success(data, "Room invite settings saved", 200), 200);
    } catch (e: unknown) {
      if (e instanceof RoomInviteAllowlistNotConnectionError) {
        return c.json(
          ApiResponse.error({
            message: e.message,
            statusCode: 400,
            code: "ALLOWLIST_NOT_CONNECTION",
          }),
          400,
        );
      }
      throw e;
    }
  } catch (error: unknown) {
    logger.error("Update room invite settings error", { error });
    return internalError(c, error, "UPDATE_ROOM_INVITE_SETTINGS_FAILED");
  }
};

export const handleFetchProfileSteps = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const query = c.req.query();
    const parsed = fetchProfileStepsQuerySchema.safeParse({
      page: query.page,
      limit: query.limit,
    });
    const { page, limit } = parsed.success ? parsed.data : { page: 1, limit: 6 };

    const result = await fetchProfileStepsService({ userId, page, limit });

    return c.json(
      ApiResponse.success(
        {
          steps: result.steps,
          profileCompletion: result.profileCompletion,
          isProfileComplete: result.isProfileComplete,
        },
        "Steps retrieved successfully",
        200,
        result.meta
      ),
      200
    );
  } catch (error: unknown) {
    logger.error("Fetch profile steps error", { error });
    return internalError(c, error, "FETCH_STEPS_FAILED");
  }
};
