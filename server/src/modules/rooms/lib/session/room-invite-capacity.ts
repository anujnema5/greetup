/**
 * Seat math for circle invites: active participants + pending invitees (deduped).
 * Direct rooms skip this — invites may expand 1:1 → circle on accept.
 */

export function countReservedRoomSeats(
  activeUserIds: string[],
  pendingInviteeIds: string[],
): number {
  const seats = new Set(activeUserIds);
  for (const id of pendingInviteeIds) {
    seats.add(id);
  }
  return seats.size;
}

/** Whether a new or re-sent invite fits within `maxParticipants` (host included). */
export function canInviteWithoutExceedingCapacity(
  activeUserIds: string[],
  pendingInviteeIds: string[],
  maxParticipants: number,
  inviteeUserId: string,
): boolean {
  const seats = new Set(activeUserIds);
  for (const id of pendingInviteeIds) {
    seats.add(id);
  }

  if (seats.has(inviteeUserId)) {
    return seats.size <= maxParticipants;
  }

  return seats.size + 1 <= maxParticipants;
}
