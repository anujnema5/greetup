/** Global namespace Socket.IO — server emits; clients listen while in a circle session. */
export const CIRCLE_ROOM_SOCKET_EVENTS = {
  /** Host used “End call for everyone”; all other participants should leave RTC + UI. */
  hostEndedForEveryone: "circle:host_ended_for_everyone",
  /** Host renamed the live circle; clients update in-call title. */
  titleUpdated: "circle:title_updated",
} as const;
