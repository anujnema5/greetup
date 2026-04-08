import type { Context } from "hono";

import logger from "@/core/logging";
import { ApiResponse, internalError } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";

import { parseConnectionIdRouteParam } from "../lib/connection-id-route-param";
import { respondIncomingFailurePayload } from "../lib/respond-incoming-http";
import { connectionRequestBodySchema } from "../schemas/connection-request.schema";
import { listConnectionsQuerySchema } from "../schemas/connections-list.query.schema";
import { listMyConnectionsService } from "../services/list-my-connections.service";
import {
  acceptIncomingConnectionService,
  rejectIncomingConnectionService,
} from "../services/respond-incoming-connection.service";
import { disconnectConnectionService } from "../services/disconnect-connection.service";
import { withdrawConnectionRequestService } from "../services/withdraw-connection-request.service";
import { requestConnectionService } from "../services/request-connection.service";

export const handleListMyConnections = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const query = c.req.query();
    const parsed = listConnectionsQuerySchema.safeParse({
      filter: query.filter,
      page: query.page,
      limit: query.limit,
      q: query.q,
    });

    if (!parsed.success) {
      const errors = zodFieldErrorsItems(parsed.error);
      return c.json(
        ApiResponse.error({
          message: "Invalid query parameters",
          statusCode: 400,
          code: "VALIDATION_ERROR",
          errors,
        }),
        400,
      );
    }

    const result = await listMyConnectionsService(userId, parsed.data);

    return c.json(
      ApiResponse.success(result, "Connections retrieved", 200),
      200,
    );
  } catch (error: unknown) {
    logger.error("List connections error", { error });
    return internalError(c, error, "LIST_CONNECTIONS_FAILED");
  }
};

export const handleRequestConnection = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }

    const parsed = connectionRequestBodySchema.safeParse(body);
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

    const result = await requestConnectionService(userId, parsed.data.targetUserId);

    if (!result.ok) {
      const message =
        result.error === "SELF"
          ? "Cannot connect to yourself"
          : result.error === "BLOCKED"
            ? "Cannot connect with this user"
            : "Already connected";
      const statusCode = result.error === "ALREADY_CONNECTED" ? 409 : 400;
      return c.json(
        ApiResponse.error({
          message,
          statusCode,
          code: result.error,
        }),
        statusCode,
      );
    }

    return c.json(
      ApiResponse.success(
        { status: result.status, connectionId: result.connectionId },
        result.status === "accepted" ? "Connection accepted" : "Request sent",
        200,
      ),
      200,
    );
  } catch (error: unknown) {
    logger.error("Request connection error", { error });
    return internalError(c, error, "REQUEST_CONNECTION_FAILED");
  }
};

export const handleAcceptIncomingConnection = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const param = parseConnectionIdRouteParam(c);
    if (!param.ok) {
      return param.response;
    }

    const result = await acceptIncomingConnectionService(userId, param.connectionId);
    if (!result.ok) {
      const p = respondIncomingFailurePayload(result.error, "accept");
      return c.json(ApiResponse.error(p), p.statusCode);
    }

    return c.json(ApiResponse.success({ ok: true }, "Connection accepted", 200), 200);
  } catch (error: unknown) {
    logger.error("Accept connection error", { error });
    return internalError(c, error, "ACCEPT_CONNECTION_FAILED");
  }
};

export const handleRejectIncomingConnection = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const param = parseConnectionIdRouteParam(c);
    if (!param.ok) {
      return param.response;
    }

    const result = await rejectIncomingConnectionService(userId, param.connectionId);
    if (!result.ok) {
      const p = respondIncomingFailurePayload(result.error, "reject");
      return c.json(ApiResponse.error(p), p.statusCode);
    }

    return c.json(ApiResponse.success({ ok: true }, "Request declined", 200), 200);
  } catch (error: unknown) {
    logger.error("Reject connection error", { error });
    return internalError(c, error, "REJECT_CONNECTION_FAILED");
  }
};

export const handleDisconnectConnection = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const param = parseConnectionIdRouteParam(c);
    if (!param.ok) {
      return param.response;
    }

    const result = await disconnectConnectionService(userId, param.connectionId);
    if (!result.ok) {
      const payload =
        result.error === "NOT_FOUND"
          ? {
              message: "Connection not found",
              statusCode: 404,
              code: result.error,
            }
          : result.error === "FORBIDDEN"
            ? {
                message: "You cannot disconnect this connection",
                statusCode: 403,
                code: result.error,
              }
            : {
                message: "Only accepted connections can be removed",
                statusCode: 400,
                code: result.error,
              };
      return c.json(ApiResponse.error(payload), payload.statusCode as 400 | 403 | 404);
    }

    return c.json(ApiResponse.success({ ok: true }, "Connection removed", 200), 200);
  } catch (error: unknown) {
    logger.error("Disconnect connection error", { error });
    return internalError(c, error, "DISCONNECT_CONNECTION_FAILED");
  }
};

export const handleWithdrawConnectionRequest = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const param = parseConnectionIdRouteParam(c);
    if (!param.ok) {
      return param.response;
    }

    const result = await withdrawConnectionRequestService(userId, param.connectionId);
    if (!result.ok) {
      const payload =
        result.error === "NOT_FOUND"
          ? {
              message: "Connection request not found",
              statusCode: 404,
              code: result.error,
            }
          : result.error === "FORBIDDEN"
            ? {
                message: "Only the sender can withdraw this request",
                statusCode: 403,
                code: result.error,
              }
            : {
                message: "Only pending requests can be withdrawn",
                statusCode: 400,
                code: result.error,
              };
      return c.json(ApiResponse.error(payload), payload.statusCode as 400 | 403 | 404);
    }

    return c.json(ApiResponse.success({ ok: true }, "Request withdrawn", 200), 200);
  } catch (error: unknown) {
    logger.error("Withdraw connection request error", { error });
    return internalError(c, error, "WITHDRAW_CONNECTION_REQUEST_FAILED");
  }
};
