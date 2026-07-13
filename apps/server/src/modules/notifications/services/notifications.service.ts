import logger from "@/core/logging";
import { notificationsRepository } from "../repositories/notifications.repository";

export const notificationsService = {
  async listForUser(userId: string, page: number, limit: number, unreadOnly: boolean) {
    return notificationsRepository.listForUser(userId, page, limit, unreadOnly);
  },

  async unreadCountForUser(userId: string) {
    return notificationsRepository.unreadCountForUser(userId);
  },

  async markRead(userId: string, notificationId: string) {
    const result = await notificationsRepository.markRead(userId, notificationId);
    logger.info("notification_marked_read", { userId, notificationId, updated: !!result });
    return result;
  },

  async markAllRead(userId: string) {
    const count = await notificationsRepository.markAllRead(userId);
    logger.info("notifications_marked_all_read", { userId, count });
    return count;
  },
};
