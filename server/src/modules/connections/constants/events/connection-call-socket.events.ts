/**
 * Socket.IO events for 1:1 connection call (ring / accept / decline).
 * Must stay in sync with client `CONNECTION_CALL_SOCKET_EVENTS`.
 */
export const CONNECTION_CALL_SOCKET_EVENTS = {
  ring: "connection:call:ring",
  accepted: "connection:call:accepted",
  declined: "connection:call:declined",
  cancelled: "connection:call:cancelled",
  missed: "connection:call:missed",
} as const;
