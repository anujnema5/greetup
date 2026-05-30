/**
 * Onboarding status service – returns whether user has completed onboarding
 * (`user_profiles.is_onboarded`), set when profile setup saves meet completion rules.
 */

import logger from "@/core/logging";
import { userProfilesRepository } from "../repositories/user-profiles.repository";

export async function getOnboardingStatusService(
  userId: string,
): Promise<{ isOnboarded: boolean }> {
  const status = await userProfilesRepository.getOnboardingStatus(userId);
  logger.debug("onboarding_status_fetched", { userId, isOnboarded: status.isOnboarded });
  return status;
}
