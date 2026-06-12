/**
 * Public API for the guest call trial module.
 * Other modules must import from here — not from internal paths.
 */

export {
  assertDeviceMayStartGuestCallTrial,
  assertIpMayCreateGuestSession,
  incrementIpGuestSessionCreateCount,
  isDeviceCallTrialConsumed,
} from "./services/abuse/guest-trial-abuse.service";

export { logGuestTrialEvent } from "./services/audit/log-guest-trial-event.service";

export { getGuestCallTrialStatus } from "./services/status/get-guest-call-trial-status.service";

export { assertGuestCallTrialAvailable } from "./services/trial/assert-guest-call-trial-available.service";
export { consumeGuestCallTrial } from "./services/trial/consume-guest-call-trial.service";

export { createGuestSession } from "./services/session/create-guest-session.service";
export {
  detectGuestSignupOnRegister,
  getGuestSignupMergeCandidate,
} from "./services/session/detect-guest-signup-on-register.service";
export { resolveGuestSignupMergeContext } from "./services/session/resolve-guest-signup-merge-context.service";
export { upgradeGuestUserOnSignup } from "./services/session/upgrade-guest-user-on-signup.service";
export { getConvertedGuestOnboardingHints } from "./services/onboarding/get-converted-guest-onboarding-hints.service";

export { resolveGuestAuthContext } from "./services/auth/resolve-guest-auth-context.service";

export { assertGuestReadyForMatchSearch } from "./services/matching/assert-guest-ready-for-match-search.service";

export { assertGuestMayAccessRoom } from "./services/rooms/assert-guest-may-access-room.service";
export { includesGuestParticipant } from "./services/rooms/includes-guest-participant.service";
export { computeGuestMatchRoomSessionExpiresAt } from "./lib/compute-guest-match-room-session-cap";
export { GUEST_CALL_MAX_DURATION_MS } from "./constants/guest-trial.constants";

export {
  guestTrialUtcDateKey,
  hashGuestTrialIp,
  hashGuestTrialValue,
} from "./lib/guest-trial-hash";

export { guestRoute } from "./router";

export {
  blockGuestFromFullApp,
  blockGuestFromProfileRoutes,
  requireGuestCallTrialAvailable,
  requireGuestCallTrialForMatchConnect,
} from "./middleware";

export type {
  ConsumeGuestCallTrialInput,
  ConsumeGuestCallTrialResult,
  ConvertedGuestOnboardingHints,
  GuestAuthContext,
  GuestCallTrialStatus,
  GuestFlowNextStep,
  GuestSignupContextApiResponse,
  GuestSignupMergeContext,
  GuestSignupRegisterProvider,
  LogGuestTrialEventInput,
} from "./types";
