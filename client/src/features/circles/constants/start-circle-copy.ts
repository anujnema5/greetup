/**
 * User-visible copy for Start a circle — keep wording changes here for consistency.
 */

export const START_CIRCLE_COPY = {
  modalTitle: "Start a circle",
  modalDescription:
    "Name it, invite who should hear about it, set who can join, then go live or schedule.",
  titleLabel: "Title",
  titlePlaceholder: "e.g. Late-night founder jam",
  categoryLabel: "Category",
  whoCanJoinLabel: "Who can join",
  visibilityPublic: "Public — listed for your community",
  visibilityPrivate: "Private — share an invite code",
  descriptionLabel: "Description",
  descriptionOptional: "(optional)",
  descriptionPlaceholder: "What is this circle about?",
  seatsLabel: "Seats",
  seatsHint: "2–8 people including you (launch cap)",
  whenLabel: "When",
  whenStartNow: "Start now",
  whenScheduleLater: "Schedule for later",
  scheduleDateLabel: "Date",
  schedulePickDate: "Pick a date",
  scheduleTimeLabel: "Time",
  inviteFriendsTitle: "Invite peoples",
  inviteSubtitleLoading: "Loading connections…",
  inviteSubtitleNoConnections: "Add connections first so you can notify them",
  inviteSubtitleChoose: "Choose who should get an invite",
  inviteSubtitleCount: (n: number) =>
    `${n} ${n === 1 ? "person" : "people"} will be notified`,
  inviteSubtitleWithCap: (n: number, cap: number) =>
    `${n} of ${cap} invite slot${cap === 1 ? "" : "s"} used · you take one seat`,
  inviteCapacityReachedToast: (cap: number) =>
    `This circle only has room for ${cap} invited ${cap === 1 ? "person" : "people"} (plus you). Remove someone or raise seats.`,
  toastInvitesExceedSeats: (cap: number) =>
    `Too many invites: pick at most ${cap} ${cap === 1 ? "person" : "people"} for this room size (you use one seat).`,
  toastTrimmedInvites: (removed: number) =>
    `Removed ${removed} invite${removed === 1 ? "" : "s"} — they no longer fit the smaller room size.`,
  inviteButton: "Invite",
  moreOptions: "More Options",
  advancedHostStartsMeetingLabel: "Host opens the circle",
  advancedHostStartsMeetingHint:
    "Lobby until you open the room. Turning this on turns off automatic start at the scheduled time.",
  advancedMeetingAutoStartLabel: "Auto-start at scheduled time",
  advancedMeetingAutoStartHint:
    "Open the room at the scheduled time without you tapping Start. Turning this on turns off “host opens the circle.”",
  advancedMeetingAutoStartInstantHint:
    "Only applies when you schedule for later.",
  advancedHostControlsSpeakerLabel: "Host controls active speaker",
  advancedHostControlsSpeakerHint:
    "Only you choose who is highlighted when several people could be speaking.",
  categoriesLoading: "Loading…",
  categoriesErrorTitle: "Categories unavailable",
  categoriesRetry: "Retry",
  categoriesEmpty:
    "No categories yet. Run migrations and seed circle categories on the server, then refresh.",
  toastPickCategory: "Pick a category",
  toastAddTitle: "Add a title for your circle",
  toastPickDate: "Pick a date",
  toastFutureTime: "Choose a date and time in the future",
  toastCreateError: "Couldn’t start the circle. Try again.",
  submitGoLive: "Go live",
  submitSchedule: "Schedule",
  submitWorking: "Starting…",
  cancel: "Cancel",
  modalTitleEdit: "Edit scheduled circle",
  modalDescriptionEdit:
    "Update the schedule, category, who can join, seats, invites, and other details for this circle.",
  saveChanges: "Save changes",
  saveWorking: "Saving…",
  deleteCircle: "Delete scheduled circle",
  deleteWorking: "Deleting…",
  confirmDeleteScheduled:
    "Cancel this scheduled circle? People you invited will no longer see it.",
  toastUpdated: "Circle updated",
  toastDeleted: "Scheduled circle removed",
  toastDeleteError: "Could not delete this circle. Try again.",
  toastUpdateError: "Could not save changes. Try again.",
} as const;
