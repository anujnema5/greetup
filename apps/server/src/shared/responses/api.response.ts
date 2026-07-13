import type { Context } from "hono";
import { resolveInternalMessage } from "@/shared/messages";

/**
 * Single shared 500 handler. Controllers just call `internalError(c, error)` —
 * the dev/prod message decision is made here and nowhere else.
 */
export const internalError = (c: Context, error?: unknown, code = "INTERNAL_ERROR") =>
  c.json(
    ApiResponse.error({
      message: resolveInternalMessage(error),
      statusCode: 500,
      code,
    }),
    500
  );

export class ApiResponse {
  static success<T>(
    data?: T,
    message: string = "Success",
    statusCode: number = 200,
    meta?: Record<string, any>
  ) {
    return {
      success: true,
      statusCode,
      message,
      data: data ?? null,
      meta,
      timestamp: new Date().toISOString(),
    };
  }

  static error(options: {
    message: string;
    statusCode?: number;
    code?: string;
    errors?: any[];
    stack?: string;
  }) {
    const {
      message,
      statusCode = 500,
      code = "INTERNAL_ERROR",
      errors,
      stack,
    } = options;

    const response: Record<string, any> = {
      success: false,
      statusCode,
      code,
      message,
      timestamp: new Date().toISOString(),
    };

    if (errors?.length) {
      response.errors = errors;
    }

    if (process.env.NODE_ENV === "development" && stack) {
      response.stack = stack;
    }

    return response;
  }
}
