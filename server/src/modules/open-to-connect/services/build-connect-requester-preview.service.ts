import { openToConnectDiscoveryRepository } from "../repositories/open-to-connect-discovery.repository";
import { otcRedisIndexService } from "./otc-redis-index.service";
import type { OpenToConnectActivityTagDto } from "../types";

export type ConnectRequesterPreviewDto = {
  headline: string | null;
  activities: OpenToConnectActivityTagDto[];
  lookingFor: string[];
  profession: string | null;
  sharedInterests: string[];
};

function listSharedInterestLabels(
  viewerInterestIds: string[],
  peerInterestIds: string[],
  labelsById: Map<string, string>,
): string[] {
  const peerSet = new Set(peerInterestIds);
  const labels: string[] = [];
  for (const id of viewerInterestIds) {
    if (!peerSet.has(id)) continue;
    const label = labelsById.get(id);
    if (label) labels.push(label);
  }
  return labels;
}

export async function buildConnectRequesterPreview(
  requesterUserId: string,
  targetUserId: string,
): Promise<ConnectRequesterPreviewDto> {
  const tagsByUserId = await otcRedisIndexService.readTagsForUsers([requesterUserId, targetUserId]);
  const requesterTags = tagsByUserId.get(requesterUserId);
  const targetInterestIds = tagsByUserId.get(targetUserId)?.interestIds ?? [];
  const requesterInterestIds = requesterTags?.interestIds ?? [];

  const profileRows = await openToConnectDiscoveryRepository.loadUserProfilesByUserIds([
    requesterUserId,
  ]);
  const profile = profileRows[0];

  const profileId = profile?.profileId;
  const [activitiesByProfileId, lookingForByProfileId, professionByProfileId] = profileId
    ? await Promise.all([
        openToConnectDiscoveryRepository.loadActivitiesByProfileIds([profileId]),
        openToConnectDiscoveryRepository.loadLookingForLabelsByProfileIds([profileId]),
        openToConnectDiscoveryRepository.loadProfessionLabelsByProfileIds([profileId]),
      ])
    : [new Map<string, OpenToConnectActivityTagDto[]>(), new Map<string, string[]>(), new Map<string, string | null>()];

  const interestLabelIds = [...new Set([...requesterInterestIds, ...targetInterestIds])];
  const interestLabelsById =
    interestLabelIds.length > 0
      ? await openToConnectDiscoveryRepository.loadInterestLabelsByIds(interestLabelIds)
      : new Map<string, string>();

  return {
    headline: requesterTags?.headline ?? null,
    activities: profileId ? (activitiesByProfileId.get(profileId) ?? []) : [],
    lookingFor: profileId ? (lookingForByProfileId.get(profileId) ?? []) : [],
    profession: profileId ? (professionByProfileId.get(profileId) ?? null) : null,
    sharedInterests: listSharedInterestLabels(
      targetInterestIds,
      requesterInterestIds,
      interestLabelsById,
    ),
  };
}
