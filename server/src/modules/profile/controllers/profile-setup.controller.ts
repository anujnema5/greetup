import type { Context } from "hono";
import { ApiResponse } from "@/shared/responses";
import { fetchProfileStepsService } from "../services/profile-steps.service";
import { fetchProfileStepsQuerySchema } from "../schemas/profile-setup.schema";

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
