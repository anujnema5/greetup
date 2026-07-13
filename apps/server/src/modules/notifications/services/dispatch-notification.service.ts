import logger from "@/core/logging";
import { notifications } from "@/core/database/schema";
import { emitToUser } from "@/core/socket";
import {
  notificationsRepository,
  type CreateNotificationInput,
  type NotificationActorSnapshot,
} from "../repositories/notifications.repository";

export type NotificationActorContext = {
  actor: NotificationActorSnapshot | null;
  actorName: string;
};

function emitNotificationCreated(
  recipientUserId: string,
  row: typeof notifications.$inferSelect,
) {
  emitToUser(recipientUserId, "notification:new", { notification: row });
}

async function loadActorContext(
  actorUserId: string,
  nameFallback: string,
): Promise<NotificationActorContext> {
  const actor = await notificationsRepository.findActorSnapshotByUserId(actorUserId);
  return { actor, actorName: actor?.name ?? nameFallback };
}

/** Insert notification row; emit realtime event when a row was created (not deduped). */
export async function dispatchNotification(input: CreateNotificationInput) {
  const created = await notificationsRepository.create(input);
  if (created) {
    emitNotificationCreated(input.recipientUserId, created);
    logger.info("notification_dispatched", {
      recipientUserId: input.recipientUserId,
      notificationId: created.id,
      type: input.type,
    });
  } else {
    logger.debug("notification_dispatch_skipped", {
      recipientUserId: input.recipientUserId,
      type: input.type,
      reason: "deduped",
    });
  }
  return created;
}

/**
 * Loads actor snapshot, then builds and persists the notification.
 * Domain modules supply `build` with copy, payload, and dedupeKey.
 */
export async function dispatchNotificationWithActor(
  actorUserId: string,
  nameFallback: string,
  build: (ctx: NotificationActorContext) => CreateNotificationInput,
) {
  const ctx = await loadActorContext(actorUserId, nameFallback);
  return dispatchNotification(build(ctx));
}
