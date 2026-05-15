/**
 * Must match `server/src/modules/rooms/constants/scheduled-circle-join-grace.ts`
 * (`SCHEDULED_JOIN_GRACE_AFTER_START_MINUTES`).
 */
export const SCHEDULED_JOIN_GRACE_AFTER_START_MINUTES = 120;

export function scheduledJoinGraceHumanShort(): string {
  const m = SCHEDULED_JOIN_GRACE_AFTER_START_MINUTES;
  if (m >= 60 && m % 60 === 0) {
    const h = m / 60;
    return `${h} hour${h === 1 ? "" : "s"}`;
  }
  return `${m} minutes`;
}

/** Start / schedule flows — paragraph under date & time. */
export function scheduleTimeMeaningNote(): string {
  const g = scheduledJoinGraceHumanShort();
  return `This time is when the room can open — not when the circle ends. People can still join for about ${g} after that if the circle hasn’t been closed, and the circle keeps going with whoever’s in it.`;
}

/** Compact line for cards / lobby. */
export function scheduledStartTimeDisclaimerCompact(): string {
  const g = scheduledJoinGraceHumanShort();
  return `Not a hard end — late joins OK for about ${g} while the room stays open.`;
}
