export const NOTIFICATION_TAG_LIST = "LIST";
export const NOTIFICATION_TAG_UNREAD_COUNT = "UNREAD_COUNT";

export const notificationInvalidationTags = [
  { type: "Notifications" as const, id: NOTIFICATION_TAG_LIST },
  { type: "Notifications" as const, id: NOTIFICATION_TAG_UNREAD_COUNT },
];
