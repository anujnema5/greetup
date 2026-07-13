import type { Context } from "hono";

import logger from "@/core/logging";
import { ApiResponse, internalError } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";
import {
  initiateConnectionCallSchema,
  respondConnectionCallSchema,
  cancelConnectionCallSchema,
} from "../schemas/connection-call.schema";
import {
  cancelConnectionCallService,
  ConnectionCallError,
  initiateConnectionCallService,
  markConnectionCallMissedService,
  respondConnectionCallService,
} from "../services/connection-call.service";

function connectionCallErrorResponse(c: Context, error: ConnectionCallError): Response {
  return c.json(
    ApiResponse.error({
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
    }),
    error.statusCode as 400 | 403 | 404 | 409 | 503,
  );
}

export const handleInitiateConnectionCall = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }

    const parsed = initiateConnectionCallSchema.safeParse(body);
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

    const data = await initiateConnectionCallService(
      userId,
      parsed.data.conversationId,
      parsed.data.mode,
    );
    return c.json(ApiResponse.success(data, "Call started", 201), 201);
  } catch (error: unknown) {
    if (error instanceof ConnectionCallError) {
      return connectionCallErrorResponse(c, error);
    }
    logger.error("Initiate connection call error", { error });
    return internalError(c, error, "INITIATE_CONNECTION_CALL_FAILED");
  }
};

export const handleRespondConnectionCall = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const requestId = c.req.param("requestId");
    if (!requestId) {
      return c.json(
        ApiResponse.error({ message: "requestId is required", statusCode: 400, code: "VALIDATION_ERROR" }),
        400,
      );
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }

    const parsed = respondConnectionCallSchema.safeParse(body);
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

    const data = await respondConnectionCallService(userId, requestId, parsed.data.accept);
    return c.json(ApiResponse.success(data, parsed.data.accept ? "Call accepted" : "Call declined", 200), 200);
  } catch (error: unknown) {
    if (error instanceof ConnectionCallError) {
      return connectionCallErrorResponse(c, error);
    }
    logger.error("Respond connection call error", { error });
    return internalError(c, error, "RESPOND_CONNECTION_CALL_FAILED");
  }
};

export const handleCancelConnectionCall = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const requestId = c.req.param("requestId");
    if (!requestId) {
      return c.json(
        ApiResponse.error({ message: "requestId is required", statusCode: 400, code: "VALIDATION_ERROR" }),
        400,
      );
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }

    const parsed = cancelConnectionCallSchema.safeParse(body);
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

    await cancelConnectionCallService(userId, requestId, parsed.data.reason ?? "cancelled");
    return c.json(ApiResponse.success({ cancelled: true }, "Call cancelled", 200), 200);
  } catch (error: unknown) {
    if (error instanceof ConnectionCallError) {
      return connectionCallErrorResponse(c, error);
    }
    logger.error("Cancel connection call error", { error });
    return internalError(c, error, "CANCEL_CONNECTION_CALL_FAILED");
  }
};

export const handleMarkConnectionCallMissed = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const requestId = c.req.param("requestId");
    if (!requestId) {
      return c.json(
        ApiResponse.error({ message: "requestId is required", statusCode: 400, code: "VALIDATION_ERROR" }),
        400,
      );
    }

    await markConnectionCallMissedService(userId, requestId);
    return c.json(ApiResponse.success({ missed: true }, "Call marked missed", 200), 200);
  } catch (error: unknown) {
    if (error instanceof ConnectionCallError) {
      return connectionCallErrorResponse(c, error);
    }
    logger.error("Mark connection call missed error", { error });
    return internalError(c, error, "MARK_CONNECTION_CALL_MISSED_FAILED");
  }
};
