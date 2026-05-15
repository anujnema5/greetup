/**
 * True when the DB circle is still `scheduled` and its start time is in the future.
 * Used so RTC token / open-meeting return `LOBBY_NOT_READY` until the scheduled time;
 * `join-room` still allows a lobby participant row so the client can show preview + retry.
 */
export function isScheduledCircleBeforeStartTime(room: {
  roomType: string;
  status: string;
  scheduledStartAt: Date | null;
}): boolean {
  if (room.roomType !== "circle" || room.status !== "scheduled") {
    return false;
  }
  if (!room.scheduledStartAt) {
    return false;
  }
  return Date.now() < room.scheduledStartAt.getTime();
}
