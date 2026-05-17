/** Toast warnings this many minutes before `expires_at`. */
export const ROOM_SESSION_WARNING_MINUTES = [15, 5] as const;

export type RoomSessionWarningMinutes = (typeof ROOM_SESSION_WARNING_MINUTES)[number];

export const ROOM_SESSION_WARNING_COPY: Record<
  RoomSessionWarningMinutes,
  string
> = {
  15: "This call will end in about 15 minutes.",
  5: "This call will end in about 5 minutes.",
};

/** Poll GET `/room/:id` while in-call so `expires_at` stays fresh after session restart. */
export const ROOM_SESSION_EXPIRY_POLL_MS = 60_000;
