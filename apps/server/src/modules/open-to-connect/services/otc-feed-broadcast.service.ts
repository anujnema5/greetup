import logger from "@/core/logging";
import { userBlocksRepository } from "@/modules/blocks/repositories/user-blocks.repository";
import { listLiveOnlineUserIds } from "@/modules/presence/services/live-online-users.service";

import { openToConnectDiscoveryRepository } from "../repositories/open-to-connect-discovery.repository";
import { otcRedisIndexService } from "./otc-redis-index.service";
import { otcSocketService, type OtcFeedUserAvailablePayload } from "./otc-socket.service";

async function buildOpenUserPayload(
  openUserId: string,
): Promise<OtcFeedUserAvailablePayload | null> {
  const visible = await otcRedisIndexService.isUserVisibleInDiscovery(openUserId);
  if (!visible) return null;

  const tags = (await otcRedisIndexService.readTagsForUsers([openUserId])).get(openUserId);
  if (!tags) return null;

  const profile = (await openToConnectDiscoveryRepository.loadUserProfilesByUserIds([openUserId]))[0];
  if (!profile) return null;

  const [activitiesByProfileId, lookingForByProfileId, professionByProfileId] =
    await Promise.all([
      openToConnectDiscoveryRepository.loadActivitiesByProfileIds([profile.profileId]),
      openToConnectDiscoveryRepository.loadLookingForLabelsByProfileIds([profile.profileId]),
      openToConnectDiscoveryRepository.loadProfessionLabelsByProfileIds([profile.profileId]),
    ]);
  const interestLabelsById = await openToConnectDiscoveryRepository.loadInterestLabelsByIds(
    tags.interestIds,
  );

  return {
    userId: profile.userId,
    username: profile.username,
    displayName: profile.displayName,
    name: profile.name,
    image: profile.image,
    headline: tags.headline,
    activities: activitiesByProfileId.get(profile.profileId) ?? [],
    lookingFor: lookingForByProfileId.get(profile.profileId) ?? [],
    profession: professionByProfileId.get(profile.profileId) ?? null,
    interestIds: tags.interestIds,
    interestLabels: Object.fromEntries(interestLabelsById),
  };
}

async function listViewerIdsForOpenUser(openUserId: string): Promise<string[]> {
  const [liveIds, blockedPeerIds] = await Promise.all([
    listLiveOnlineUserIds(),
    userBlocksRepository.listAllBlockedPeerIds(openUserId),
  ]);
  const blocked = new Set(blockedPeerIds);
  return liveIds.filter((id) => id !== openUserId && !blocked.has(id));
}

export const otcFeedBroadcastService = {
  async notifyUserAvailable(openUserId: string): Promise<void> {
    try {
      const payload = await buildOpenUserPayload(openUserId);
      if (!payload) return;

      const viewerIds = await listViewerIdsForOpenUser(openUserId);
      for (const viewerId of viewerIds) {
        otcSocketService.emitFeedUserAvailable(viewerId, payload);
      }
    } catch (err) {
      logger.warn("[otcFeedBroadcastService.notifyUserAvailable] failed", {
        openUserId,
        err,
      });
    }
  },

  async notifyUserUnavailable(userId: string): Promise<void> {
    try {
      const viewers = (await listLiveOnlineUserIds()).filter((id) => id !== userId);
      for (const viewerId of viewers) {
        otcSocketService.emitFeedUserUnavailable(viewerId, { userId });
      }
    } catch (err) {
      logger.warn("[otcFeedBroadcastService.notifyUserUnavailable] failed", { userId, err });
    }
  },
};
