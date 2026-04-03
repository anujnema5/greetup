/**
 * Onboarding status service – returns whether user has completed onboarding.
 */

import { userProfilesRepository } from "../repositories/user-profiles.repository";

export async function getOnboardingStatusService(
  userId: string
): Promise<{ isOnboarded: boolean }> {
  return userProfilesRepository.getOnboardingStatus(userId);
}
