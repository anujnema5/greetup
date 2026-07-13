import { eq } from "drizzle-orm";

import { db } from "@/core/database";
import { users } from "@/core/database/schema";
import logger from "@/core/logging";
import {
  activityCatalogRepository,
  ActivitySelectionValidationError,
  MAX_MATCH_PREP_ACTIVITY_SELECTIONS,
} from "@/modules/session-activities";
import {
  cancelMatchService,
  getUserMatchStateService,
} from "@/modules/matching/services/matchmaking.service";
import { profileSetupRepository } from "@/modules/profile/repositories/profile-setup.repository";
import { getUserActiveRtcRoomId } from "@/modules/rooms/services/rtc/user-active-rtc-room-redis.service";
import { refreshProfileSnapshotFromDatabase } from "@/modules/user/services/profile-snapshot-cache.service";
import { AppError } from "@/shared/errors";

import { openToConnectStatusRepository } from "../repositories/open-to-connect-status.repository";
import type { EnableOpenToConnectBody } from "../schemas/enable-open-to-connect.schema";
import { otcRedisIndexService } from "./otc-redis-index.service";
import { otcFeedBroadcastService } from "./otc-feed-broadcast.service";
import type { OpenToConnectMeDto, OpenToConnectTags } from "../types";

async function assertCanEnableOpenToConnect(userId: string): Promise<void> {
  const matchState = await getUserMatchStateService(userId);
  if (matchState.status === "matched" && matchState.roomId) {
    throw new AppError("Leave your current session before going open", 409, "CONFLICT");
  }

  if (matchState.status === "searching" || matchState.status === "proposed") {
    await cancelMatchService(userId);
  }

  const online = await otcRedisIndexService.isUserOnline(userId);
  if (!online) {
    throw new AppError("You must be online to let people find you", 409, "CONFLICT");
  }
}

async function buildTagsForUser(userId: string): Promise<OpenToConnectTags | null> {
  const row = await openToConnectStatusRepository.findByUserId(userId);
  if (!row?.openToConnect || row.openToConnectPausedForRoom || row.isGuest) return null;

  const userRow = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { displayName: true, name: true },
  });

  const interestIds = await openToConnectStatusRepository.listInterestIdsForProfile(row.profileId);
  const moodIds = row.moods.map((m) => m.moodId);
  const activityIds = row.activities.map((a) => a.activityId);
  const updatedAt = (row.openToConnectUpdatedAt ?? new Date()).toISOString();

  return {
    profileId: row.profileId,
    userId,
    displayName: userRow?.displayName ?? userRow?.name ?? null,
    headline: row.openToConnectHeadline,
    activityIds,
    moodIds,
    interestIds,
    updatedAt,
  };
}

export async function syncOpenToConnectIndexIfEnabled(
  userId: string,
  options?: { broadcast?: boolean },
): Promise<void> {
  try {
    const tags = await buildTagsForUser(userId);
    const online = tags ? await otcRedisIndexService.isUserOnline(userId) : false;

    if (!tags || !online) {
      await otcRedisIndexService.removeUserFromIndex(userId);
      return;
    }

    await otcRedisIndexService.syncUserToIndex(tags);
    if (options?.broadcast !== false) {
      void otcFeedBroadcastService.notifyUserAvailable(userId);
    }
  } catch (err) {
    logger.warn("[syncOpenToConnectIndexIfEnabled] failed", { userId, err });
  }
}

export async function disableOpenToConnectForUser(userId: string): Promise<void> {
  const profileId = await profileSetupRepository.getOrCreateProfile(userId);
  await openToConnectStatusRepository.setOpenState(profileId, {
    openToConnect: false,
    source: null,
    headline: null,
  });
  await otcRedisIndexService.removeUserFromIndex(userId);
  await refreshProfileSnapshotFromDatabase(userId);
  void otcFeedBroadcastService.notifyUserUnavailable(userId);
}

/** Hide from discovery while in a room; keeps user preference (openToConnect) intact. */
export async function pauseOpenToConnectForRoom(userId: string): Promise<void> {
  const row = await openToConnectStatusRepository.findByUserId(userId);
  if (!row?.openToConnect || row.openToConnectPausedForRoom) return;

  await openToConnectStatusRepository.setPausedForRoom(row.profileId, true);
  await otcRedisIndexService.removeUserFromIndex(userId);
  await refreshProfileSnapshotFromDatabase(userId);
  void otcFeedBroadcastService.notifyUserUnavailable(userId);
}

/** Restore discovery after leaving a room when preference was on. */
export async function restoreOpenToConnectAfterRoom(userId: string): Promise<void> {
  const row = await openToConnectStatusRepository.findByUserId(userId);
  if (!row?.openToConnectPausedForRoom) return;

  await openToConnectStatusRepository.setPausedForRoom(row.profileId, false);
  await refreshProfileSnapshotFromDatabase(userId);
  await syncOpenToConnectIndexIfEnabled(userId, { broadcast: true });
}

export async function enableOpenToConnectService(
  userId: string,
  body: EnableOpenToConnectBody,
): Promise<OpenToConnectMeDto> {
  await assertCanEnableOpenToConnect(userId);

  const profileId = await profileSetupRepository.getOrCreateProfile(userId);
  const headline =
    body.headline != null && body.headline.trim() !== "" ? body.headline.trim() : null;

  if (body.activitySelections !== undefined) {
    const validated = await activityCatalogRepository.validateSelectionsAgainstCatalog(
      body.activitySelections,
      { context: "match_prep", matchIntent: "quick", maxCount: MAX_MATCH_PREP_ACTIVITY_SELECTIONS },
    );
    const statusRow = await openToConnectStatusRepository.findByUserId(userId);
    if (statusRow?.id) {
      await openToConnectStatusRepository.replaceActivities(statusRow.id, validated);
    }
  }

  await openToConnectStatusRepository.setOpenState(profileId, {
    openToConnect: true,
    source: body.source,
    headline,
  });

  await refreshProfileSnapshotFromDatabase(userId);

  const activeRtcRoomId = await getUserActiveRtcRoomId(userId);

  try {
    const tags = await buildTagsForUser(userId);
    if (tags) {
      await otcRedisIndexService.syncUserToIndex(tags);
      if (!activeRtcRoomId) {
        void otcFeedBroadcastService.notifyUserAvailable(userId);
      }
    }
  } catch (err) {
    logger.error("[enableOpenToConnectService] Redis sync failed — rolling back visibility", {
      userId,
      err,
    });
    await otcRedisIndexService.removeUserFromIndex(userId);
    throw new AppError("Could not go open right now. Try again.", 503, "SERVICE_UNAVAILABLE");
  }

  if (activeRtcRoomId) {
    await pauseOpenToConnectForRoom(userId);
  }

  return getOpenToConnectMeService(userId);
}

export async function disableOpenToConnectService(userId: string): Promise<OpenToConnectMeDto> {
  await disableOpenToConnectForUser(userId);
  return getOpenToConnectMeService(userId);
}

export async function getOpenToConnectMeService(userId: string): Promise<OpenToConnectMeDto> {
  const row = await openToConnectStatusRepository.findByUserId(userId);

  if (!row) {
    return {
      openToConnect: false,
      pausedForRoom: false,
      source: null,
      headline: null,
      updatedAt: null,
      activityIds: [],
      moodIds: [],
      interestIds: [],
      visibleInDiscovery: false,
    };
  }

  const pausedForRoom = row.openToConnectPausedForRoom;
  const visibleInDiscovery =
    row.openToConnect && !pausedForRoom
      ? await otcRedisIndexService.isUserVisibleInDiscovery(userId)
      : false;

  const profileId = row.profileId;
  const interestIds = await openToConnectStatusRepository.listInterestIdsForProfile(profileId);

  return {
    openToConnect: row.openToConnect,
    pausedForRoom,
    source: row.openToConnectSource,
    headline: row.openToConnectHeadline,
    updatedAt: row.openToConnectUpdatedAt?.toISOString() ?? null,
    activityIds: row.activities.map((a) => a.activityId),
    moodIds: row.moods.map((m) => m.moodId),
    interestIds,
    visibleInDiscovery,
  };
}

export { ActivitySelectionValidationError };
