/** Auth provider initiating a full-account signup while a guest session may be active. */
export type GuestSignupRegisterProvider = "email" | "google" | "phone";

/**
 * Active guest session eligible for in-place upgrade on signup (Step 21).
 * Populated by {@link detectGuestSignupOnRegister} during register flows.
 */
export type GuestSignupMergeContext = {
  guestUserId: string;
  guestSessionId: string;
  trialConsumed: boolean;
  displayName: string | null;
  deviceHash: string | null;
  ipHash: string | null;
};

export type GuestSignupContextApiResponse = {
  hasGuestSession: boolean;
  mergeAvailable: boolean;
  trialConsumed: boolean;
  fromGuestIntent: boolean;
};
