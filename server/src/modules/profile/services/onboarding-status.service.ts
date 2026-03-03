/**
 * Onboarding status service – returns whether user has completed onboarding.
 */

import { db } from "@/core/database";

export async function getOnboardingStatusService(
  userId: string
): Promise<{ isOnboarded: boolean }> {
  const profile = await db.query.userProfiles.findFirst({
    where: (p, { eq }) => eq(p.userId, userId),
    columns: { isOnboarded: true },
  });

  return {
    isOnboarded: profile?.isOnboarded ?? false,
  };
}
