import type { Context } from "hono";

import { ApiResponse, internalError } from "@/shared/responses";
import { AppError } from "@/shared/errors";
import logger from "@/core/logging";

import {
  createConnectRequestBodySchema,
  respondConnectRequestBodySchema,
} from "../schemas/connect-request.schema";
import {
  cancelConnectRequestService,
  createConnectRequestService,
  listInboundConnectRequestsService,
  listOutboundConnectRequestsService,
  respondConnectRequestService,
} from "../services/connect-requests.service";

export const handleCreateConnectRequest = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json(
        ApiResponse.error({ message: "Invalid JSON body", statusCode: 400, code: "VALIDATION_ERROR" }),
        400,
      );
    }
    const parsed = createConnectRequestBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        ApiResponse.error({
          message: parsed.error.issues[0]?.message ?? "Invalid request body",
          statusCode: 400,
          code: "VALIDATION_ERROR",
        }),
        400,
      );
    }

    const result = await createConnectRequestService(userId, parsed.data);
    return c.json(ApiResponse.success(result, "Request sent", 201), 201);
  } catch (error) {
    if (error instanceof AppError) {
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: error.statusCode,
          code: error.code,
        }),
        error.statusCode as 400 | 403 | 404 | 409,
      );
    }
    logger.error("[handleCreateConnectRequest] failed", { error });
    return internalError(c, error, "CONNECT_REQUEST_CREATE_FAILED");
  }
};

export const handleListInboundConnectRequests = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const items = await listInboundConnectRequestsService(userId);
    return c.json(ApiResponse.success({ items }, "Inbound requests", 200), 200);
  } catch (error) {
    logger.error("[handleListInboundConnectRequests] failed", { error });
    return internalError(c, error, "CONNECT_REQUEST_INBOUND_FAILED");
  }
};

export const handleListOutboundConnectRequests = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const items = await listOutboundConnectRequestsService(userId);
    return c.json(ApiResponse.success({ items }, "Outbound requests", 200), 200);
  } catch (error) {
    logger.error("[handleListOutboundConnectRequests] failed", { error });
    return internalError(c, error, "CONNECT_REQUEST_OUTBOUND_FAILED");
  }
};

export const handleRespondConnectRequest = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const requestId = c.req.param("id")?.trim() ?? "";
    if (!requestId) {
      return c.json(
        ApiResponse.error({ message: "Request id is required", statusCode: 400, code: "VALIDATION_ERROR" }),
        400,
      );
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json(
        ApiResponse.error({ message: "Invalid JSON body", statusCode: 400, code: "VALIDATION_ERROR" }),
        400,
      );
    }
    const parsed = respondConnectRequestBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        ApiResponse.error({
          message: parsed.error.issues[0]?.message ?? "Invalid request body",
          statusCode: 400,
          code: "VALIDATION_ERROR",
        }),
        400,
      );
    }

    const result = await respondConnectRequestService(userId, requestId, parsed.data.accept);
    return c.json(ApiResponse.success(result, parsed.data.accept ? "Accepted" : "Declined", 200), 200);
  } catch (error) {
    if (error instanceof AppError) {
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: error.statusCode,
          code: error.code,
        }),
        error.statusCode as 400 | 404 | 409,
      );
    }
    logger.error("[handleRespondConnectRequest] failed", { error });
    return internalError(c, error, "CONNECT_REQUEST_RESPOND_FAILED");
  }
};

export const handleCancelConnectRequest = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const requestId = c.req.param("id")?.trim() ?? "";
    if (!requestId) {
      return c.json(
        ApiResponse.error({ message: "Request id is required", statusCode: 400, code: "VALIDATION_ERROR" }),
        400,
      );
    }

    await cancelConnectRequestService(userId, requestId);
    return c.json(ApiResponse.success(null, "Request cancelled", 200), 200);
  } catch (error) {
    if (error instanceof AppError) {
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: error.statusCode,
          code: error.code,
        }),
        error.statusCode as 404 | 409,
      );
    }
    logger.error("[handleCancelConnectRequest] failed", { error });
    return internalError(c, error, "CONNECT_REQUEST_CANCEL_FAILED");
  }
};
