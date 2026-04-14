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
  descriptionPlaceholder: "What’s the vibe?",
  seatsLabel: "Seats",
  seatsHint: "2–100 (you count as the host)",
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
  inviteButton: "Invite",
  moreOptions: "More Options",
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
} as const;
