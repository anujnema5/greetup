/**
 * Socket.IO events for direct-call chess invite lifecycle.
 * Must stay in sync with client `CHESS_SOCKET_EVENTS`.
 */
export const CHESS_SOCKET_EVENTS = {
  invite: "room:chess_invite",
  declined: "room:chess_declined",
  started: "room:chess_started",
  ended: "room:chess_ended",
} as const;
