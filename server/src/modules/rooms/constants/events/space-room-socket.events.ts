/** Global namespace Socket.IO — server emits; clients listen while in a space session. */
export const SPACE_ROOM_SOCKET_EVENTS = {
  /** Host used “End call for everyone”; all other participants should leave RTC + UI. */
  hostEndedForEveryone: "space:host_ended_for_everyone",
  /** User removed from the live space (host kick or NSFW policy); leave RTC + UI. */
  participantRemoved: "space:participant_removed",
  /** Host renamed the live space; clients update in-call title. */
  titleUpdated: "space:title_updated",
  /** Space is joinable for RTC (lobby gate cleared or live without host gate). */
  openedForJoin: "space:opened_for_join",
} as const;

