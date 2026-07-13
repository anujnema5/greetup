import { guestProfileRepository } from "../../repositories/guest-profile.repository";
import type { ConvertedGuestOnboardingHints } from "../../types/converted-guest-onboarding.types";

const NO_HINTS: ConvertedGuestOnboardingHints = {
  isConvertedGuest: false,
  matchPrepComplete: false,
  skipProfileInterestsStep: false,
  skipMatchPrepPrompt: false,
};

/**
 * Returns shortened-onboarding rules for users merged from a guest trial session (Step 22).
 */
export async function getConvertedGuestOnboardingHints(
  userId: string,
): Promise<ConvertedGuestOnboardingHints> {
  const profile = await guestProfileRepository.findByUserId(userId);
  if (!profile || profile.isGuest || profile.guestConvertedAt == null) {
    return NO_HINTS;
  }

  const matchPrepComplete = await guestProfileRepository.isMatchPrepReadyForUserId(userId);

  return {
    isConvertedGuest: true,
    matchPrepComplete,
    skipProfileInterestsStep: matchPrepComplete,
    skipMatchPrepPrompt: matchPrepComplete,
  };
}
