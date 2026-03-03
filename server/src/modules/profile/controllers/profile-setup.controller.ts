import type { Context } from "hono";
import { ApiResponse } from "@/shared/responses";
import { fetchProfileStepsService } from "../services/profile-steps.service";
import { saveProfileSetupStepService } from "../services/profile-setup-save.service";
import { getOnboardingStatusService } from "../services/onboarding-status.service";
import {
  fetchProfileStepsQuerySchema,
  saveProfileSetupBodySchema,
} from "../schemas/profile-setup.schema";

export const handleGetOnboardingStatus = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const result = await getOnboardingStatusService(userId);
    return c.json(
      ApiResponse.success(result, "Onboarding status retrieved", 200),
      200
    );
  } catch (error: unknown) {
    console.error("Get onboarding status error:", error);
    return c.json(
      ApiResponse.error({
        message:
          error instanceof Error
            ? error.message
            : "Failed to get onboarding status",
        statusCode: 500,
        code: "ONBOARDING_STATUS_FAILED",
      }),
      500
    );
  }
};

export const handleSaveProfileSetup = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const body = await c.req.json();
    const parsed = saveProfileSetupBodySchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const errors = Object.entries(fieldErrors).map(([field, messages]) => ({
        field,
        messages: messages ?? [],
      }));
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
    console.error("Save profile setup error:", error);
    return c.json(
      ApiResponse.error({
        message:
          error instanceof Error ? error.message : "Failed to save profile step",
        statusCode: 500,
        code: "SAVE_PROFILE_SETUP_FAILED",
      }),
      500
    );
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
    console.error("Fetch steps error:", error);
    return c.json(
      ApiResponse.error({
        message: error instanceof Error ? error.message : "Failed to fetch steps",
        statusCode: 500,
        code: "FETCH_STEPS_FAILED",
      }),
      500
    );
  }
};
