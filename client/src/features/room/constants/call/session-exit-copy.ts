/**
 * Copy for leaving a live session (1:1 conversation or space).
 * Primary action is always “Leave”; hosts get a separate “end for everyone” path.
 */

export type SessionExitCopy = {
  leaveButtonLabel: string;
  leaveCaption: string;
  leaveTitle: string;
  leaveAriaLabel: string;
  moreOptionsAriaLabel: string;
  moreOptionsTitle: string;
  hostEndForEveryoneMenuLabel?: string;
  hostEndForEveryoneMenuAriaLabel?: string;
  hostEndAlertTitle?: string;
  hostEndAlertDescription?: string;
  hostEndAlertConfirmLabel?: string;
};

export const SESSION_EXIT_HOST_END_ALERT = {
  title: "End space for everyone?",
  description:
    "Everyone still connected will be disconnected. Scheduled spaces stay on your calendar; instant spaces close.",
  confirm: "End for everyone",
} as const;

export function getSessionExitCopy(params: {
  isGroupRoom: boolean;
  hostCanEndForEveryone: boolean;
}): SessionExitCopy {
  const { isGroupRoom, hostCanEndForEveryone } = params;

  if (!isGroupRoom) {
    return {
      leaveButtonLabel: "Leave",
      leaveCaption: "Leave",
      leaveTitle: "Leave this conversation",
      leaveAriaLabel: "Leave conversation",
      moreOptionsAriaLabel: "More options",
      moreOptionsTitle: "More options",
    };
  }

  if (hostCanEndForEveryone) {
    return {
      leaveButtonLabel: "Leave",
      leaveCaption: "Leave",
      leaveTitle: "Leave the space — others can stay",
      leaveAriaLabel: "Leave — only you disconnect",
      moreOptionsAriaLabel: "More leave options",
      moreOptionsTitle: "More leave options",
      hostEndForEveryoneMenuLabel: "End for everyone",
      hostEndForEveryoneMenuAriaLabel: "End space for everyone",
      hostEndAlertTitle: SESSION_EXIT_HOST_END_ALERT.title,
      hostEndAlertDescription: SESSION_EXIT_HOST_END_ALERT.description,
      hostEndAlertConfirmLabel: SESSION_EXIT_HOST_END_ALERT.confirm,
    };
  }

  return {
    leaveButtonLabel: "Leave",
    leaveCaption: "Leave",
    leaveTitle: "Leave the space",
    leaveAriaLabel: "Leave space",
    moreOptionsAriaLabel: "More options",
    moreOptionsTitle: "More options",
  };
}
