import type { Context } from "hono";

import logger from "@/core/logging";
import { ApiResponse, internalError } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";

import { blockUserBodySchema } from "../schemas/block-user.schema";
import { blockUserService } from "../services/block-user.service";
import { listBlockedUsersService } from "../services/list-blocked-users.service";
import { unblockUserService } from "../services/unblock-user.service";

export const handleListBlockedUsers = async (c: Context) => {
  try {
    const viewerId = c.get("userId") as string;
    const items = await listBlockedUsersService(viewerId);
    return c.json(ApiResponse.success({ items }, "Blocked users retrieved", 200), 200);
  } catch (error: unknown) {
    logger.error("List blocked users error", { error });
    return internalError(c, error, "LIST_BLOCKED_USERS_FAILED");
  }
};

export const handleBlockUser = async (c: Context) => {
  try {
    const viewerId = c.get("userId") as string;
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }

    const parsed = blockUserBodySchema.safeParse(body);
    if (!parsed.success) {
      const errors = zodFieldErrorsItems(parsed.error);
      return c.json(
        ApiResponse.error({
          message: "Invalid body",
          statusCode: 400,
          code: "VALIDATION_ERROR",
          errors,
        }),
        400,
      );
    }

    const result = await blockUserService(viewerId, parsed.data.targetUserId);
    if (!result.ok) {
      return c.json(
        ApiResponse.error({
          message: "You cannot block yourself",
          statusCode: 400,
          code: result.error,
        }),
        400,
      );
    }

    return c.json(
      ApiResponse.success({ ok: true, alreadyBlocked: result.alreadyBlocked }, "User blocked", 200),
      200,
    );
  } catch (error: unknown) {
    logger.error("Block user error", { error });
    return internalError(c, error, "BLOCK_USER_FAILED");
  }
};

export const handleUnblockUser = async (c: Context) => {
  try {
    const viewerId = c.get("userId") as string;
    const targetUserId = c.req.param("targetUserId")?.trim();
    if (!targetUserId) {
      return c.json(
        ApiResponse.error({
          message: "User id required",
          statusCode: 400,
          code: "VALIDATION_ERROR",
        }),
        400,
      );
    }

    const result = await unblockUserService(viewerId, targetUserId);
    if (!result.ok) {
      return c.json(
        ApiResponse.error({
          message: "Block not found",
          statusCode: 404,
          code: "NOT_FOUND",
        }),
        404,
      );
    }

    return c.json(ApiResponse.success({ ok: true }, "User unblocked", 200), 200);
  } catch (error: unknown) {
    logger.error("Unblock user error", { error });
    return internalError(c, error, "UNBLOCK_USER_FAILED");
  }
};
