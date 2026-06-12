/** Guest call-trial flags attached to every authenticated HTTP request. */
export type GuestAuthContext = {
  isGuest: boolean;
  guestTrialConsumed: boolean;
};
