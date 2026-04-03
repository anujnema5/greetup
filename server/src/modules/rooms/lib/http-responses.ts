import type { Context } from "hono";
import type { ZodError } from "zod";

import { ApiResponse } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";

/** 400 for Zod failures on inbound JSON (matches profile / connections handlers). */
export const zodBodyValidationError = (c: Context, error: ZodError) =>
  c.json(
    ApiResponse.error({
      message: "Invalid request body",
      statusCode: 400,
      code: "VALIDATION_ERROR",
      errors: zodFieldErrorsItems(error),
    }),
    400,
  );
