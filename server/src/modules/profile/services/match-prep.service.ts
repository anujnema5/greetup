import { eq } from "drizzle-orm";

import { db } from "@/core/database";
import { currentStatus } from "@/core/database/schema";
import logger from "@/core/logging";
import { refreshProfileSnapshotFromDatabase } from "@/modules/user/services/profile-snapshot-cache.service";
import { matchPrepSessionRepository } from "../repositories/match-prep-session.repository";
import { matchPrepStatusRepository } from "../repositories/match-prep-status.repository";
import { profileSetupRepository } from "../repositories/profile-setup.repository";
import { profileStepsRepository } from "../repositories/profile-steps.repository";
import type { MatchPrepSaveBody } from "../schemas/match-prep.schema";

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
  };
}

export async function getMatchPrepCurrentService(userId: string) {
  const profileId = await profileSetupRepository.getOrCreateProfile(userId);
  const row = await db.query.currentStatus.findFirst({
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
  });

  if (!row) {
    return {
      moodIds: [] as string[],
      lookingForIds: [] as string[],
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
    current.moodIds.length > 0 && current.lookingForIds.length > 0;
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
    sessionGoal,
    connectionPreference: body.connectionPreference ?? null,
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
