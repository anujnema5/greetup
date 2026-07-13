import { Hono } from "hono";

import {
  handleListNotifications,
  handleMarkAllNotificationsRead,
  handleMarkNotificationRead,
  handleUnreadCount,
} from "./controllers/notifications.controller";

export const notificationsRoute = new Hono();

notificationsRoute.get("/", handleListNotifications);
notificationsRoute.get("/unread-count", handleUnreadCount);
notificationsRoute.post("/read-all", handleMarkAllNotificationsRead);
notificationsRoute.post("/:notificationId/read", handleMarkNotificationRead);
