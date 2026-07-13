import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";

import type {
  OpenNowFeedData,
  OpenNowFeedItem,
  OpenToConnectMe,
} from "../types/open-to-connect.types";
import type {
  OtcFeedUserAvailableSocketPayload,
  OtcFeedUserUnavailableSocketPayload,
} from "../types/open-to-connect-socket.types";

function listSharedInterestLabels(
  viewerInterestIds: string[],
  peerInterestIds: string[],
  interestLabels: Record<string, string>,
): string[] {
  const peerSet = new Set(peerInterestIds);
  const labels: string[] = [];
  for (const id of viewerInterestIds) {
    if (!peerSet.has(id)) continue;
    const label = interestLabels[id];
    if (label) labels.push(label);
  }
  return labels;
}

function toFeedItem(
  payload: OtcFeedUserAvailableSocketPayload,
  viewerInterestIds: string[],
): OpenNowFeedItem {
  const sharedInterests = listSharedInterestLabels(
    viewerInterestIds,
    payload.interestIds,
    payload.interestLabels,
  );

  return {
    userId: payload.userId,
    username: payload.username,
    displayName: payload.displayName,
    name: payload.name,
    image: payload.image,
    headline: payload.headline,
    activities: payload.activities,
    lookingFor: payload.lookingFor ?? [],
    profession: payload.profession ?? null,
    sharedInterestCount: sharedInterests.length,
    sharedInterests,
    isOnline: true,
  };
}

function matchesFeedFilters(
  payload: OtcFeedUserAvailableSocketPayload,
  activityId: string,
  interestId: string,
): boolean {
  if (activityId) {
    const hasActivity = payload.activities.some((row) => row.activityId === activityId);
    if (!hasActivity) return false;
  }
  if (interestId && !payload.interestIds.includes(interestId)) {
    return false;
  }
  return true;
}

function upsertIntoFeedData(
  prev: OpenNowFeedData | undefined,
  person: OpenNowFeedItem,
  hardLimit: number,
): OpenNowFeedData {
  const limit = prev?.limit ?? hardLimit;
  const without = (prev?.items ?? []).filter((row) => row.userId !== person.userId);
  const items = [person, ...without].slice(0, limit);
  return {
    items,
    nextCursor: prev?.nextCursor ?? null,
    limit,
  };
}

function removeFromFeedData(
  prev: OpenNowFeedData | undefined,
  userId: string,
): OpenNowFeedData | undefined {
  if (!prev) return prev;
  return {
    ...prev,
    items: prev.items.filter((row) => row.userId !== userId),
  };
}

function filterKeysFromQueryKey(queryKey: QueryKey): { activityId: string; interestId: string } {
  return {
    activityId: typeof queryKey[2] === "string" ? queryKey[2] : "",
    interestId: typeof queryKey[3] === "string" ? queryKey[3] : "",
  };
}

function invalidateOpenNowFeedInfinite(qc: QueryClient) {
  void qc.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] === queryKeys.openToConnect.all[0] &&
      query.queryKey[1] === "feed-infinite",
  });
}

function patchListQueries(
  qc: QueryClient,
  listKey: "feed" | "sidebar" | "search-suggestions",
  hardLimit: number,
  payload: OtcFeedUserAvailableSocketPayload,
  person: OpenNowFeedItem,
) {
  const defaultKey =
    listKey === "feed"
      ? queryKeys.openToConnect.feed({})
      : listKey === "sidebar"
        ? queryKeys.openToConnect.sidebar({})
        : queryKeys.openToConnect.searchSuggestions;

  const matchingQueries = qc.getQueryCache().findAll({
    predicate: (query) =>
      query.queryKey[0] === queryKeys.openToConnect.all[0] && query.queryKey[1] === listKey,
  });

  const keysToPatch =
    matchingQueries.length > 0
      ? matchingQueries.map((query) => query.queryKey)
      : [defaultKey];

  for (const queryKey of keysToPatch) {
    const { activityId, interestId } = filterKeysFromQueryKey(queryKey);
    if (!matchesFeedFilters(payload, activityId, interestId)) continue;
    qc.setQueryData<OpenNowFeedData>(queryKey, (prev) =>
      upsertIntoFeedData(prev, person, hardLimit),
    );
  }
}

export function upsertOpenNowPersonInCaches(
  qc: QueryClient,
  payload: OtcFeedUserAvailableSocketPayload,
) {
  const me = qc.getQueryData<OpenToConnectMe>(queryKeys.openToConnect.me);
  const viewerInterestIds = me?.interestIds ?? [];
  const person = toFeedItem(payload, viewerInterestIds);

  patchListQueries(qc, "feed", 12, payload, person);
  patchListQueries(qc, "sidebar", 8, payload, person);
  patchListQueries(qc, "search-suggestions", 5, payload, person);
  invalidateOpenNowFeedInfinite(qc);
}

export function removeOpenNowPersonFromCaches(
  qc: QueryClient,
  payload: OtcFeedUserUnavailableSocketPayload,
) {
  const { userId } = payload;

  const matchingQueries = qc.getQueryCache().findAll({
    predicate: (query) =>
      query.queryKey[0] === queryKeys.openToConnect.all[0] &&
      (query.queryKey[1] === "feed" ||
        query.queryKey[1] === "sidebar" ||
        query.queryKey[1] === "search-suggestions"),
  });

  const keysToPatch =
    matchingQueries.length > 0
      ? matchingQueries.map((query) => query.queryKey)
      : [
          queryKeys.openToConnect.feed({}),
          queryKeys.openToConnect.sidebar({}),
          queryKeys.openToConnect.searchSuggestions,
        ];

  for (const queryKey of keysToPatch) {
    qc.setQueryData<OpenNowFeedData>(queryKey, (prev) => removeFromFeedData(prev, userId));
  }
  invalidateOpenNowFeedInfinite(qc);
}
