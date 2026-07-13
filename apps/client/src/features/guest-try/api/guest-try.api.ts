import { API_ENDPOINTS, apiFetch } from "@/lib/api";
import { getOrCreateDeviceFingerprint } from "@/lib/device-fingerprint";

import type { CreateTrySessionData, GuestTryStatus } from "../types/guest-try.types";

export type SignupMergeContext = {
  hasGuestSession: boolean;
  mergeAvailable: boolean;
  trialConsumed: boolean;
  fromGuestIntent: boolean;
};

export async function fetchGuestTryStatus(): Promise<GuestTryStatus> {
  return apiFetch<GuestTryStatus>(API_ENDPOINTS.GUEST.STATUS);
}

export async function fetchSignupMergeContext(
  fromGuest = true,
): Promise<SignupMergeContext> {
  const query = fromGuest ? "?from=guest" : "";
  return apiFetch<SignupMergeContext>(`${API_ENDPOINTS.GUEST.SIGNUP_CONTEXT}${query}`);
}

export async function createTrySession(): Promise<CreateTrySessionData> {
  return apiFetch<CreateTrySessionData>(API_ENDPOINTS.GUEST.CREATE_SESSION, {
    method: "POST",
    body: JSON.stringify({
      deviceFingerprint: getOrCreateDeviceFingerprint(),
    }),
  });
}

export async function saveTryDisplayName(
  displayName: string,
): Promise<{ displayName: string }> {
  return apiFetch<{ displayName: string }>(API_ENDPOINTS.GUEST.PROFILE, {
    method: "PATCH",
    body: JSON.stringify({ displayName }),
  });
}

export type VibePrefsPayload = {
  moodIds: string[];
  lookingForIds: string[];
  interestIds: string[];
};

export async function saveVibePrefs(body: VibePrefsPayload): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(API_ENDPOINTS.GUEST.MATCH_PREP, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
