/** Global namespace Socket.IO — server emits; clients listen while in a circle session. */
export const CIRCLE_ROOM_SOCKET_EVENTS = {
  /** Host used “End call for everyone”; all other participants should leave RTC + UI. */
  hostEndedForEveryone: "circle:host_ended_for_everyone",
  /** User removed from the live circle (host kick or NSFW policy); leave RTC + UI. */
  participantRemoved: "circle:participant_removed",
  /** Host renamed the live circle; clients update in-call title. */
  titleUpdated: "circle:title_updated",
  /** Circle is joinable for RTC (lobby gate cleared or live without host gate). */
  openedForJoin: "circle:opened_for_join",
} as const;
