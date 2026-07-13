import { API_ENDPOINTS, apiFetch, buildQueryParams } from "@/lib/api";
import type { UsernameVibe } from "@/features/profile/lib/username";

const { PROFILE } = API_ENDPOINTS;

export type UsernameCheckResult = {
  username: string;
  available: boolean;
  valid: boolean;
};

export type UsernameSuggestionsResult = {
  suggestions: string[];
  displayName: string | null;
  vibe: UsernameVibe;
};

export async function checkUsernameAvailability(username: string): Promise<UsernameCheckResult> {
  const qs = buildQueryParams({ username: username.trim().toLowerCase() });
  const data = await apiFetch<UsernameCheckResult | null | undefined>(
    `${PROFILE.USERNAME_CHECK}?${qs}`,
  );
  if (!data) throw new Error("Could not check username");
  return data;
}

export async function fetchUsernameSuggestions(args?: {
  vibe?: UsernameVibe;
  limit?: number;
}): Promise<UsernameSuggestionsResult> {
  const qs = buildQueryParams({
    ...(args?.vibe ? { vibe: args.vibe } : {}),
    ...(args?.limit ? { limit: args.limit } : {}),
  });
  const data = await apiFetch<UsernameSuggestionsResult | null | undefined>(
    `${PROFILE.USERNAME_SUGGESTIONS}?${qs}`,
  );
  if (!data) throw new Error("Could not load username suggestions");
  return data;
}
