/** Must stay in sync with `server/src/modules/guest/constants/events/guest-trial-socket.events.ts`. */
export const TRY_SOCKET_EVENTS = {
  tryConsumed: "guest:trial_consumed",
} as const;

export type TryConsumedSocketPayload = {
  guestUserId: string;
  trialConsumed: true;
};
