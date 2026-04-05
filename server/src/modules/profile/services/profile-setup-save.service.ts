/**
 * Profile setup save service – persists step data and recalculates completion.
 */

import { profileSetupRepository } from "../repositories/profile-setup.repository";
import { profileStepsRepository } from "../repositories/profile-steps.repository";
import type {
  SaveProfileSetupParams,
  SaveProfileSetupResult,
} from "../types/profile-setup-services.types";
import {
  fetchProfileStepsService,
  PROFILE_COMPLETE_THRESHOLD,
} from "./profile-steps.service";
import { refreshProfileSnapshotFromDatabase } from "@/modules/user/services/profile-snapshot-cache.service";
import logger from "@/core/logging";

/**
 * Calculate profile completion (0–100) from current profile state.
 * Uses forceRecalculate so we always get the computed value, not stored 0.
 */
async function recalculateCompletion(userId: string): Promise<number> {
  const result = await fetchProfileStepsService({
    userId,
    page: 1,
    limit: 10,
    forceRecalculate: true,
  });
  return result.profileCompletion;
}

/**
 * Save profile setup data for a single step.
 */
export async function saveProfileSetupStepService(
  params: SaveProfileSetupParams
): Promise<SaveProfileSetupResult> {
  const { userId, body } = params;
  const profileId = await profileSetupRepository.getOrCreateProfile(userId);

  switch (body.step) {
    case 1: {
      const { displayName, username, age, gender, country } = body.data;
      await Promise.all([
        profileSetupRepository.updateUserDisplayName(userId, displayName),
        profileSetupRepository.setUsername(userId, username),
        profileSetupRepository.updateBasicProfile(profileId, { age, gender }),
        profileSetupRepository.upsertLocation(profileId, {
          country: country.name,
          countryCode: country.code,
        }),
      ]);
      break;
    }

    case 2: {
      const goalIds = body.data.goals.map((g) => g.id);
      await profileSetupRepository.replaceGoals(profileId, goalIds);
      break;
    }

    case 3: {
      const interestIds = body.data.interests.map((i) => i.id);
      await profileSetupRepository.replaceInterests(profileId, interestIds);
      break;
    }

    case 4: {
      if (body.data.profession) {
        await profileSetupRepository.replaceProfessions(
          profileId,
          body.data.profession.id
        );
      } else {
        await profileSetupRepository.replaceProfessions(profileId, null);
      }
      break;
    }

    case 5: {
      const prefs: Parameters<
        typeof profileSetupRepository.upsertPreferences
      >[1] = {};
      if (body.data.preferredGender)
        prefs.preferredGender = body.data.preferredGender;
      if (body.data.distancePreference)
        prefs.distancePreference = body.data.distancePreference;
      if (body.data.ageRange) {
        prefs.minAge = body.data.ageRange.min;
        prefs.maxAge = body.data.ageRange.max;
      }
      await profileSetupRepository.upsertPreferences(profileId, prefs);
      break;
    }

    case 6: {
      if (body.data.bio !== undefined) {
        await profileSetupRepository.updateBasicProfile(profileId, {
          bio: body.data.bio,
        });
      }
      if (body.data.photos && body.data.photos.length > 0) {
        await profileSetupRepository.replacePhotos(
          profileId,
          body.data.photos.map((p) => ({
            url: p.url,
            order: p.order,
          }))
        );
      }
      break;
    }
  }

  const profileCompletion = await recalculateCompletion(userId);
  const isProfileComplete = profileCompletion >= PROFILE_COMPLETE_THRESHOLD;

  await profileSetupRepository.updateCompletionAndOnboarded(profileId, {
    profileCompletion,
    isOnboarded: isProfileComplete,
  });

  try {
    await refreshProfileSnapshotFromDatabase(userId);
  } catch (err) {
    logger.warn("[saveProfileSetupStepService] Failed to refresh profile snapshot", {
      userId,
      err,
    });
  }

  return { profileCompletion, isProfileComplete };
}
