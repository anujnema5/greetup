/** Client route for joining a circle room from a notification. */
export function circleRoomNotificationDeepLink(roomId: string): string {
  return `/circle/${roomId}`;
}
