/**
 * Onboarding status service – returns whether user has completed onboarding
 * (`user_profiles.is_onboarded`), set when profile setup saves meet completion rules.
 */

import { userProfilesRepository } from "../repositories/user-profiles.repository";

export async function getOnboardingStatusService(
  userId: string,
): Promise<{ isOnboarded: boolean }> {
  return userProfilesRepository.getOnboardingStatus(userId);
}
