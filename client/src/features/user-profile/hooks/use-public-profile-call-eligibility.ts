"use client";

import { useMemo } from "react";

import { connectionsApi } from "@/features/connections/api/connections-api";
import { PRESENCE_POLL_INTERVAL_MS } from "@/features/presence/constants";

type Options = {
  peerUserId: string;
  /** Only poll call status when the viewer can actually call (connected). */
  enabled: boolean;
};

export function usePublicProfileCallEligibility({ peerUserId, enabled }: Options) {
  const cacheKey = enabled ? peerUserId : "";

  const { data: statusMap, isFetching: statusLoading } =
    connectionsApi.usePeersCallStatusQuery(cacheKey, {
      skip: !cacheKey,
      pollingInterval: PRESENCE_POLL_INTERVAL_MS,
    });

  return useMemo(() => {
    if (!enabled) {
      return {
        canCall: false,
        disabledReason: "Connect to call" as const,
        statusLoading: false,
      };
    }

    const status = statusMap?.[peerUserId];
    const isOnline = status?.isOnline ?? false;
    const inCall = status?.inLiveRoom ?? false;
    const canCall = isOnline && !inCall;

    const disabledReason = !isOnline
      ? ("Offline" as const)
      : inCall
        ? ("In a call" as const)
        : null;

    return { canCall, disabledReason, statusLoading: statusLoading && !status };
  }, [enabled, peerUserId, statusLoading, statusMap]);
}
