import type { Context } from "hono";

import { presignReportScreenshotUpload } from "@/core/storage";
import logger from "@/core/logging";
import { AppError } from "@/shared/errors";
import { ApiResponse, internalError } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";

import {
  createProblemReportBodySchema,
  presignReportScreenshotBodySchema,
} from "../schemas/problem-report.schema";
import { createProblemReportService } from "../services/create-problem-report.service";

export const handleCreateProblemReport = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const isGuest = c.get("isGuest") === true;

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }

    const parsed = createProblemReportBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        ApiResponse.error({
          message: "Invalid request body",
          statusCode: 400,
          code: "VALIDATION_ERROR",
          errors: zodFieldErrorsItems(parsed.error),
        }),
        400,
      );
    }

    const report = await createProblemReportService({ userId, isGuest, body: parsed.data });
    return c.json(
      ApiResponse.success({ id: report.id }, "Thanks — your report was submitted", 201),
      201,
    );
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Create problem report error", { error });
    return internalError(c, error, "CREATE_PROBLEM_REPORT_FAILED");
  }
};

export const handlePresignReportScreenshot = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;

    const body = await c.req.json().catch(() => ({}));
    const parsed = presignReportScreenshotBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        ApiResponse.error({
          message: "Invalid request body",
          statusCode: 400,
          code: "VALIDATION_ERROR",
          errors: zodFieldErrorsItems(parsed.error),
        }),
        400,
      );
    }

    const result = await presignReportScreenshotUpload({
      userId,
      contentType: parsed.data.contentType,
      contentLength: parsed.data.contentLength,
    });
    return c.json(ApiResponse.success(result, "Upload URL created", 200), 200);
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Presign report screenshot error", { error });
    return internalError(c, error, "PRESIGN_REPORT_SCREENSHOT_FAILED");
  }
};
