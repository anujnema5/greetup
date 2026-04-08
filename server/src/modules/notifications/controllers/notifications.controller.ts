import type { Context } from "hono";

import logger from "@/core/logging";
import { ApiResponse, internalError } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";
import { listNotificationsQuerySchema } from "../schemas/list-notifications.query.schema";
import { notificationsService } from "../services/notifications.service";

export const handleListNotifications = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const parsed = listNotificationsQuerySchema.safeParse(c.req.query());

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

    const { page, limit, unreadOnly } = parsed.data;
    const result = await notificationsService.listForUser(userId, page, limit, unreadOnly);

    return c.json(ApiResponse.success(result, "Notifications retrieved", 200), 200);
  } catch (error: unknown) {
    logger.error("List notifications error", { error });
    return internalError(c, error, "LIST_NOTIFICATIONS_FAILED");
  }
};

export const handleUnreadCount = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const unreadCount = await notificationsService.unreadCountForUser(userId);
    return c.json(ApiResponse.success({ unreadCount }, "Unread count retrieved", 200), 200);
  } catch (error: unknown) {
    logger.error("Unread count error", { error });
    return internalError(c, error, "NOTIFICATION_UNREAD_COUNT_FAILED");
  }
};

export const handleMarkNotificationRead = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const notificationId = c.req.param("notificationId")?.trim();

    if (!notificationId) {
      return c.json(
        ApiResponse.error({
          message: "Notification id is required",
          statusCode: 400,
          code: "VALIDATION_ERROR",
        }),
        400,
      );
    }

    const row = await notificationsService.markRead(userId, notificationId);
    if (!row) {
      return c.json(
        ApiResponse.error({
          message: "Notification not found",
          statusCode: 404,
          code: "NOT_FOUND",
        }),
        404,
      );
    }

    return c.json(ApiResponse.success({ ok: true }, "Notification marked as read", 200), 200);
  } catch (error: unknown) {
    logger.error("Mark notification read error", { error });
    return internalError(c, error, "MARK_NOTIFICATION_READ_FAILED");
  }
};

export const handleMarkAllNotificationsRead = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const updatedCount = await notificationsService.markAllRead(userId);
    return c.json(
      ApiResponse.success({ updatedCount }, "Notifications marked as read", 200),
      200,
    );
  } catch (error: unknown) {
    logger.error("Mark all notifications read error", { error });
    return internalError(c, error, "MARK_ALL_NOTIFICATIONS_READ_FAILED");
  }
};
