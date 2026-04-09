import { eq } from "drizzle-orm";

import { db } from "@/core/database";
import { currentStatus, profileInterests } from "@/core/database/schema";
import logger from "@/core/logging";
import { refreshProfileSnapshotFromDatabase } from "@/modules/user/services/profile-snapshot-cache.service";
import { matchPrepSessionRepository } from "../repositories/match-prep-session.repository";
import { matchPrepStatusRepository } from "../repositories/match-prep-status.repository";
import { profileSetupRepository } from "../repositories/profile-setup.repository";
import { profileStepsRepository } from "../repositories/profile-steps.repository";
import type { MatchPrepSaveBody } from "../schemas/match-prep.schema";
import { fetchProfileStepsService } from "./profile-steps.service";

export async function getMatchPrepOptionsService() {
  const opts = await profileStepsRepository.fetchStepOptions();
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
  };
}

export async function getMatchPrepCurrentService(userId: string) {
  const profileId = await profileSetupRepository.getOrCreateProfile(userId);
  const [row, interestRows] = await Promise.all([
    db.query.currentStatus.findFirst({
      where: eq(currentStatus.profileId, profileId),
      columns: {
        sessionGoal: true,
        connectionPreference: true,
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
      },
    }),
    db.query.profileInterests.findMany({
      where: eq(profileInterests.profileId, profileId),
      with: {
        interest: { columns: { id: true } },
      },
    }),
  ]);

  const interestIds = interestRows.map((pi) => pi.interest.id);

  if (!row) {
    return {
      moodIds: [] as string[],
      lookingForIds: [] as string[],
      interestIds,
      connectionPreference: null as
        | "same_profession"
        | "different_profession"
        | "open_to_anyone"
        | null,
      sessionGoal: null as string | null,
    };
  }

  return {
    moodIds: row.moods.map((m) => m.mood.id),
    lookingForIds: row.lookingFor.map((l) => l.lookingForOption.id),
    interestIds,
    connectionPreference: row.connectionPreference ?? null,
    sessionGoal: row.sessionGoal?.trim() || null,
  };
}

export async function getMatchPrepPromptStatusService(
  userId: string,
  clientSessionId: string,
): Promise<{ shouldShow: boolean }> {
  const profileId = await profileSetupRepository.getOrCreateProfile(userId);
  const savedThisTabSession = await matchPrepSessionRepository.hasSavedMatchPrepForClientSession(
    profileId,
    clientSessionId,
  );
  if (!savedThisTabSession) {
    return { shouldShow: true };
  }
  const current = await getMatchPrepCurrentService(userId);
  const hasPrep =
    current.moodIds.length > 0 &&
    current.lookingForIds.length > 0 &&
    current.interestIds.length > 0;
  return { shouldShow: !hasPrep };
}

export async function saveMatchPrepService(
  userId: string,
  body: MatchPrepSaveBody,
): Promise<void> {
  const profileId = await profileSetupRepository.getOrCreateProfile(userId);
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
  });

  const stepsResult = await fetchProfileStepsService({
    userId,
    page: 1,
    limit: 10,
    forceRecalculate: true,
  });
  await profileSetupRepository.updateCompletionAndOnboarded(profileId, {
    profileCompletion: stepsResult.profileCompletion,
    isOnboarded: stepsResult.isProfileComplete,
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
