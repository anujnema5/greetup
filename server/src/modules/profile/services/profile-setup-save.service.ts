/**
 * Profile setup save service – persists step data and recalculates completion.
 */

import { profileSetupRepository } from "../repositories/profile-setup.repository";
import type {
  SaveProfileSetupParams,
  SaveProfileSetupResult,
} from "../types/profile-setup-services.types";
import {
  buildAllProfileStepsForUser,
  computeProfileProgressFromSteps,
  PROFILE_COMPLETE_THRESHOLD,
} from "./profile-steps.service";
import { refreshProfileSnapshotFromDatabase } from "@/modules/user/services/profile-snapshot-cache.service";
import { ensureProfileImageUrlsArePublic } from "@/core/storage";
import logger from "@/core/logging";

/**
 * Calculate profile completion (0–100) and required-field gate from full step list.
 */
async function recalculateCompletion(userId: string): Promise<{
  profileCompletion: number;
  isOnboardingComplete: boolean;
}> {
  const steps = await buildAllProfileStepsForUser(userId);
  return computeProfileProgressFromSteps(steps);
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
      const { displayName, age, gender, country } = body.data;
      const saves: Promise<unknown>[] = [
        profileSetupRepository.updateUserDisplayName(userId, displayName),
        profileSetupRepository.updateBasicProfile(profileId, { age, gender }),
      ];
      if (country?.code && country?.name) {
        saves.push(
          profileSetupRepository.upsertLocation(profileId, {
            country: country.name,
            countryCode: country.code,
            source: "profile_setup",
          }),
        );
      }
      await Promise.all(saves);
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
      const saves: Promise<unknown>[] = [];

      if (body.data.bio !== undefined) {
        saves.push(
          profileSetupRepository.updateBasicProfile(profileId, {
            bio: body.data.bio,
          })
        );
      }

      if (body.data.instagram !== undefined || body.data.twitter !== undefined) {
        saves.push(
          profileSetupRepository.upsertSocials(profileId, {
            instagram: body.data.instagram,
            twitter: body.data.twitter,
          })
        );
      }

      const {
        preferredGender,
        distancePreference,
        ageRange,
      } = body.data;
      if (
        preferredGender !== undefined ||
        distancePreference !== undefined ||
        ageRange !== undefined
      ) {
        saves.push(
          profileSetupRepository.upsertPreferences(profileId, {
            ...(preferredGender !== undefined ? { preferredGender } : {}),
            ...(distancePreference !== undefined ? { distancePreference } : {}),
            ...(ageRange !== undefined
              ? { minAge: ageRange.min, maxAge: ageRange.max }
              : {}),
          }),
        );
      }

      await Promise.all(saves);

      if (body.data.photos && body.data.photos.length > 0) {
        const photoRows = body.data.photos.map((p) => ({
          url: p.url,
          order: p.order,
        }));
        await profileSetupRepository.replacePhotos(profileId, photoRows);
        const sorted = [...photoRows].sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );
        const primaryUrl = sorted[0]?.url;
        if (primaryUrl) {
          await profileSetupRepository.updateUserImage(userId, primaryUrl);
        }
        await ensureProfileImageUrlsArePublic(photoRows.map((p) => p.url));
      }
      break;
    }

    case 6: {
      await profileSetupRepository.replacePromptAnswers(profileId, body.data.answers);
      break;
    }

    case 7: {
      await profileSetupRepository.setUsername(userId, body.data.username);
      break;
    }
  }

  let { profileCompletion, isOnboardingComplete } = await recalculateCompletion(userId);

  // API step 6 = profile prompts = last onboarding screen (skip all or complete).
  if (body.step === 6) {
    isOnboardingComplete = true;
    profileCompletion = Math.max(profileCompletion, PROFILE_COMPLETE_THRESHOLD);
  }

  const isProfileComplete = isOnboardingComplete;

  await profileSetupRepository.updateCompletionAndOnboarded(profileId, {
    profileCompletion,
    isOnboarded: isOnboardingComplete,
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
