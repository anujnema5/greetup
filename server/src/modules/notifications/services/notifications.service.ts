import { notificationsRepository } from "../repositories/notifications.repository";

export const notificationsService = {
  async listForUser(userId: string, page: number, limit: number, unreadOnly: boolean) {
    return notificationsRepository.listForUser(userId, page, limit, unreadOnly);
  },

  async unreadCountForUser(userId: string) {
    return notificationsRepository.unreadCountForUser(userId);
  },

  async markRead(userId: string, notificationId: string) {
    return notificationsRepository.markRead(userId, notificationId);
  },

  async markAllRead(userId: string) {
    return notificationsRepository.markAllRead(userId);
  },
};
