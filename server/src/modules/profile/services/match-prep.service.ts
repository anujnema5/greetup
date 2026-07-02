import { asc, eq } from "drizzle-orm";

import { db } from "@/core/database";
import {
  currentStatus,
  currentStatusActivities,
  profileInterests,
  profilePreferences,
  userLocations,
} from "@/core/database/schema";
import logger from "@/core/logging";
import { getConvertedGuestOnboardingHints } from "@/modules/guest";
import { refreshProfileSnapshotFromDatabase } from "@/modules/user/services/profile-snapshot-cache.service";
import {
  activityCatalogRepository,
  ActivitySelectionValidationError,
  MAX_MATCH_PREP_ACTIVITY_SELECTIONS,
  toActivityOptionDtos,
} from "@/modules/session-activities";
import { matchPrepSessionRepository } from "../repositories/match-prep-session.repository";
import { matchPrepStatusRepository } from "../repositories/match-prep-status.repository";
import { profileSetupRepository } from "../repositories/profile-setup.repository";
import { profileStepsRepository } from "../repositories/profile-steps.repository";
import { userProfilesRepository } from "../repositories/user-profiles.repository";
import type { MatchPrepSaveBody } from "../schemas/match-prep.schema";
import { fetchProfileStepsService } from "./profile-steps.service";

type MatchDistancePreference = "random" | "same_city" | "same_country" | "global";

function toClientDistancePreference(value: string | null | undefined): MatchDistancePreference {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "same city" || normalized === "same_city") return "same_city";
  if (normalized === "same country" || normalized === "same_country") return "same_country";
  if (normalized === "global") return "global";
  return "random";
}

function toDbDistancePreference(value: MatchDistancePreference): "same city" | "same country" | "random" | "global" {
  if (value === "same_city") return "same city";
  if (value === "same_country") return "same country";
  if (value === "global") return "global";
  return "random";
}

export async function getMatchPrepOptionsService() {
  const [opts, activityCatalog] = await Promise.all([
    profileStepsRepository.fetchStepOptions(),
    activityCatalogRepository.listActiveCatalog("match_prep"),
  ]);
  return {
    moods: opts.moods.map((m) => ({
      id: m.id,
      name: m.name,
      displayName: m.displayName,
      description: m.description,
    })),
    lookingFor: opts.lookingForOptions.map((l) => ({
      id: l.id,
      name: l.name,
      displayName: l.displayName,
      description: l.description,
    })),
    interests: opts.interests.map((i) => ({
      id: i.id,
      name: i.name,
      displayName: i.displayName,
      description: null as string | null,
    })),
    activities: toActivityOptionDtos(activityCatalog),
  };
}

export async function getMatchPrepCurrentService(userId: string) {
  const profileId = await profileSetupRepository.getOrCreateProfile(userId);
  const [row, interestRows, preferences, location] = await Promise.all([
    db.query.currentStatus.findFirst({
      where: eq(currentStatus.profileId, profileId),
      columns: {
        sessionGoal: true,
        connectionPreference: true,
        matchIntent: true,
      },
      with: {
        moods: {
          with: {
            mood: { columns: { id: true } },
          },
        },
        lookingFor: {
          with: {
            lookingForOption: { columns: { id: true } },
          },
        },
        activities: {
          orderBy: [asc(currentStatusActivities.sortOrder)],
          columns: {
            detail: true,
          },
          with: {
            activity: {
              columns: { id: true, name: true, displayName: true, emoji: true },
            },
          },
        },
      },
    }),
    db.query.profileInterests.findMany({
      where: eq(profileInterests.profileId, profileId),
      with: {
        interest: { columns: { id: true } },
      },
    }),
    db.query.profilePreferences.findFirst({
      where: eq(profilePreferences.profileId, profileId),
      columns: {
        distancePreference: true,
        locationPreferenceEnabled: true,
      },
    }),
    db.query.userLocations.findFirst({
      where: eq(userLocations.profileId, profileId),
      columns: {
        country: true,
        countryCode: true,
        region: true,
        regionCode: true,
        city: true,
        latitude: true,
        longitude: true,
        source: true,
      },
    }),
  ]);

  const interestIds = interestRows.map((pi) => pi.interest.id);

  const baseLocation =
    location && location.source?.startsWith("match_prep")
      ? {
          country: location.country ?? null,
          countryCode: location.countryCode ?? null,
          region: location.region ?? null,
          regionCode: location.regionCode ?? null,
          city: location.city ?? null,
          latitude: location.latitude ?? null,
          longitude: location.longitude ?? null,
        }
      : null;

  const activitySelections =
    row?.activities.map((a) => ({
      activityId: a.activity.id,
      activityName: a.activity.name,
      displayName: a.activity.displayName,
      emoji: a.activity.emoji,
      detail: a.detail?.trim() || null,
    })) ?? [];

  if (!row) {
    return {
      moodIds: [] as string[],
      lookingForIds: [] as string[],
      interestIds,
      matchIntent: "quick" as const,
      activitySelections,
      connectionPreference: null as
        | "same_profession"
        | "different_profession"
        | "open_to_anyone"
        | null,
      sessionGoal: null as string | null,
      locationPreferenceEnabled: preferences?.locationPreferenceEnabled ?? false,
      distancePreference: toClientDistancePreference(preferences?.distancePreference),
      location: baseLocation,
    };
  }

  return {
    moodIds: row.moods.map((m) => m.mood.id),
    lookingForIds: row.lookingFor.map((l) => l.lookingForOption.id),
    interestIds,
    matchIntent: row.matchIntent ?? "quick",
    activitySelections,
    connectionPreference: row.connectionPreference ?? null,
    sessionGoal: row.sessionGoal?.trim() || null,
    locationPreferenceEnabled: preferences?.locationPreferenceEnabled ?? false,
    distancePreference: toClientDistancePreference(preferences?.distancePreference),
    location: baseLocation,
  };
}

export async function getMatchPrepPromptStatusService(
  userId: string,
  clientSessionId: string,
): Promise<{ shouldShow: boolean }> {
  const convertedGuestHints = await getConvertedGuestOnboardingHints(userId);
  if (convertedGuestHints.skipMatchPrepPrompt) {
    return { shouldShow: false };
  }

  const profileId = await profileSetupRepository.getOrCreateProfile(userId);
  const savedThisTabSession = await matchPrepSessionRepository.hasSavedMatchPrepForClientSession(
    profileId,
    clientSessionId,
  );
  if (!savedThisTabSession) {
    return { shouldShow: true };
  }
  const current = await getMatchPrepCurrentService(userId);
  const hasBasePrep =
    current.moodIds.length > 0 &&
    current.lookingForIds.length > 0 &&
    current.interestIds.length > 0;
  const hasActivityPrep =
    current.matchIntent !== "activity" || current.activitySelections.length > 0;
  return { shouldShow: !(hasBasePrep && hasActivityPrep) };
}

export async function saveMatchPrepService(
  userId: string,
  body: MatchPrepSaveBody,
): Promise<void> {
  const profileId = await profileSetupRepository.getOrCreateProfile(userId);
  const matchIntent = body.matchIntent ?? "quick";
  const activitySelections = await activityCatalogRepository.validateSelectionsAgainstCatalog(
    body.activitySelections,
    { context: "match_prep", matchIntent, maxCount: MAX_MATCH_PREP_ACTIVITY_SELECTIONS },
  );

  const sessionGoal =
    body.sessionGoal != null && body.sessionGoal.trim() !== ""
      ? body.sessionGoal.trim()
      : null;

  await matchPrepStatusRepository.replaceMatchPrepCurrentStatus(profileId, {
    moodIds: body.moodIds,
    lookingForIds: body.lookingForIds,
    interestIds: body.interestIds,
    sessionGoal,
    connectionPreference: body.connectionPreference ?? null,
    matchIntent,
    activitySelections,
  });

  const locationPreferenceEnabled = body.locationPreferenceEnabled ?? false;
  await profileSetupRepository.upsertPreferences(profileId, {
    locationPreferenceEnabled,
    distancePreference: toDbDistancePreference(
      locationPreferenceEnabled ? (body.distancePreference ?? "random") : "random",
    ),
  });

  if (body.location) {
    await profileSetupRepository.upsertLocation(profileId, {
      country: body.location.country,
      countryCode: body.location.countryCode,
      region: body.location.region,
      regionCode: body.location.regionCode,
      city: body.location.city,
      latitude: body.location.latitude,
      longitude: body.location.longitude,
      source: body.location.source ? `match_prep_${body.location.source}` : "match_prep",
    });
  }

  const [{ isOnboarded: wasOnboarded }, stepsResult] = await Promise.all([
    userProfilesRepository.getOnboardingStatus(userId),
    fetchProfileStepsService({
      userId,
      page: 1,
      limit: 10,
      forceRecalculate: true,
    }),
  ]);
  // Match-prep edits must not revoke onboarding; completion % can dip when optional steps gain new fields.
  await profileSetupRepository.updateCompletionAndOnboarded(profileId, {
    profileCompletion: stepsResult.profileCompletion,
    isOnboarded: wasOnboarded || stepsResult.isProfileComplete,
  });

  if (body.clientSessionId) {
    await matchPrepSessionRepository.recordSaveForClientSession(
      profileId,
      body.clientSessionId,
    );
  }

  try {
    await refreshProfileSnapshotFromDatabase(userId);
  } catch (err) {
    logger.warn("[saveMatchPrepService] Failed to refresh profile snapshot", {
      userId,
      err,
    });
  }
}

export { ActivitySelectionValidationError };

export async function assertMatchPrepReadyForSearch(userId: string): Promise<void> {
  const current = await getMatchPrepCurrentService(userId);
  const hasBase =
    current.moodIds.length > 0 &&
    current.lookingForIds.length > 0 &&
    current.interestIds.length > 0;
  if (!hasBase) {
    throw new MatchPrepNotReadyError("Complete match preferences before searching");
  }
  if (current.matchIntent === "activity" && current.activitySelections.length === 0) {
    throw new MatchPrepNotReadyError("Pick at least one activity for activity match");
  }
}

export class MatchPrepNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MatchPrepNotReadyError";
  }
}
