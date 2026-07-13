/** Client route for joining a space room from a notification. */
export function spaceRoomNotificationDeepLink(roomId: string): string {
  return `/space/${roomId}`;
}
