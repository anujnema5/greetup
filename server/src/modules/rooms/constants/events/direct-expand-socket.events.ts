/**
 * Socket.IO events for 1:1 → circle expansion (must stay in sync with client `DIRECT_EXPAND_SOCKET_EVENTS`).
 */
export const DIRECT_EXPAND_SOCKET_EVENTS = {
  invite: "room:direct_expand_invite",
  becameCircle: "room:became_circle",
  declined: "room:direct_expand_declined",
} as const;
