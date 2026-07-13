"use client";

import { useMemo } from "react";

import { usePeersCallStatus } from "@/features/connections/api/connections.queries";
import { PRESENCE_POLL_INTERVAL_MS } from "@/features/presence/constants";

type Options = {
  peerUserId: string;
  /** Only poll call status when the viewer can actually call (connected). */
  enabled: boolean;
};

export function usePublicProfileCallEligibility({ peerUserId, enabled }: Options) {
  const peerIds = useMemo(() => (enabled ? [peerUserId] : []), [enabled, peerUserId]);

  const { data: statusMap, isFetching: statusLoading } = usePeersCallStatus(peerIds, {
    enabled,
    refetchInterval: PRESENCE_POLL_INTERVAL_MS,
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
