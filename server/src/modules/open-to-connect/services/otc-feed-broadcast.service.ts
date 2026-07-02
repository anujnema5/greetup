import { getRedis } from "@/core/redis";
import { USER_PRESENCE_KEYS } from "@/core/redis/keys";
import logger from "@/core/logging";
import { userBlocksRepository } from "@/modules/blocks/repositories/user-blocks.repository";

import { openToConnectDiscoveryRepository } from "../repositories/open-to-connect-discovery.repository";
import { otcRedisIndexService } from "./otc-redis-index.service";
import { otcSocketService, type OtcFeedUserAvailablePayload } from "./otc-socket.service";

async function buildOpenUserPayload(
  openUserId: string,
): Promise<OtcFeedUserAvailablePayload | null> {
  const visible = await otcRedisIndexService.isUserVisibleInDiscovery(openUserId);
  if (!visible) return null;

  const tagsByUserId = await otcRedisIndexService.readTagsForUsers([openUserId]);
  const tags = tagsByUserId.get(openUserId);
  if (!tags) return null;

  const profileRows = await openToConnectDiscoveryRepository.loadUserProfilesByUserIds([openUserId]);
  const profile = profileRows[0];
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
  const redis = getRedis();
  const [onlineIds, blockedPeerIds] = await Promise.all([
    redis.smembers(USER_PRESENCE_KEYS.ONLINE_USERS_SET),
    userBlocksRepository.listAllBlockedPeerIds(openUserId),
  ]);
  const blocked = new Set(blockedPeerIds);
  return onlineIds.filter((id) => id !== openUserId && !blocked.has(id));
}

export const otcFeedBroadcastService = {
  async notifyUserAvailable(openUserId: string): Promise<void> {
    try {
      const payload = await buildOpenUserPayload(openUserId);
      if (!payload) return;

      const viewerIds = await listViewerIdsForOpenUser(openUserId);
      if (viewerIds.length === 0) return;

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
      const redis = getRedis();
      const onlineIds = await redis.smembers(USER_PRESENCE_KEYS.ONLINE_USERS_SET);
      const viewers = onlineIds.filter((id) => id !== userId);
      for (const viewerId of viewers) {
        otcSocketService.emitFeedUserUnavailable(viewerId, { userId });
      }
    } catch (err) {
      logger.warn("[otcFeedBroadcastService.notifyUserUnavailable] failed", { userId, err });
    }
  },
};
