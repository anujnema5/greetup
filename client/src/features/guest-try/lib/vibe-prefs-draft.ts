import type { MatchPrepInitialFormState } from "@/features/matching/types/match-prep.types";
import type { MatchPrepCurrentData } from "@/features/profile-setup/types/profile-setup-api.types";
import { GUEST_TRIAL_PREFS } from "@/lib/copy/user-messages";

import { VIBE_PREFS_MAX_INTERESTS, VIBE_PREFS_MIN_INTERESTS } from "../constants/vibe-prefs.constants";
import type { VibePrefsDraft } from "../types/guest-try.types";

export type VibeDraftField = keyof VibePrefsDraft;

function sortedKey(ids: string[]): string {
  return [...ids].sort().join("\0");
}

export function vibeDraftFromFormState(state: MatchPrepInitialFormState): VibePrefsDraft {
  return {
    moodIds: [...state.moods],
    lookingForIds: [...state.lookingFor],
    interestIds: [...state.interests],
  };
}

export function vibeDraftFromSaved(saved: MatchPrepCurrentData): VibePrefsDraft {
  return {
    moodIds: saved.moodIds,
    lookingForIds: saved.lookingForIds,
    interestIds: saved.interestIds,
  };
}

export function vibeDraftsEqual(a: VibePrefsDraft, b: VibePrefsDraft): boolean {
  return (
    sortedKey(a.moodIds) === sortedKey(b.moodIds) &&
    sortedKey(a.lookingForIds) === sortedKey(b.lookingForIds) &&
    sortedKey(a.interestIds) === sortedKey(b.interestIds)
  );
}

export function toggleVibeDraft(
  draft: VibePrefsDraft,
  field: VibeDraftField,
  id: string,
): VibePrefsDraft {
  const ids = draft[field];
  const nextIds = ids.includes(id)
    ? ids.filter((value) => value !== id)
    : field === "interestIds" && ids.length >= VIBE_PREFS_MAX_INTERESTS
      ? ids
      : [...ids, id];

  return { ...draft, [field]: nextIds };
}

export function validateVibeDraft(draft: VibePrefsDraft): string | null {
  if (draft.moodIds.length === 0 || draft.lookingForIds.length === 0) {
    return GUEST_TRIAL_PREFS.validationMood;
  }
  if (draft.interestIds.length < VIBE_PREFS_MIN_INTERESTS) {
    return GUEST_TRIAL_PREFS.validationInterests(VIBE_PREFS_MIN_INTERESTS);
  }
  return null;
}
