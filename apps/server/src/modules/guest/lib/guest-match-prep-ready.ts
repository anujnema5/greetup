import { GUEST_MATCH_PREP_MIN_INTERESTS } from "../constants/guest-trial.constants";

export function isGuestMatchPrepReady(prep: {
  moodIds: string[];
  lookingForIds: string[];
  interestIds: string[];
}): boolean {
  return (
    prep.moodIds.length > 0 &&
    prep.lookingForIds.length > 0 &&
    prep.interestIds.length >= GUEST_MATCH_PREP_MIN_INTERESTS
  );
}
