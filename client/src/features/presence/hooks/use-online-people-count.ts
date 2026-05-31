"use client";

import { PRESENCE_POLL_INTERVAL_MS } from "../constants";
import { useGetOnlinePeopleCountQuery } from "../api/presence-api";

/** Live count of other users online; polls every 15s. */
export function useOnlinePeopleCount() {
  const { data, isLoading, isFetching } = useGetOnlinePeopleCountQuery(undefined, {
    pollingInterval: PRESENCE_POLL_INTERVAL_MS,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const onlinePeopleCount = typeof data === "number" && Number.isFinite(data) ? data : 0;
  const hasResolvedCount = data !== undefined;
  const showOnlineBadge = hasResolvedCount && onlinePeopleCount > 0;

  return {
    onlinePeopleCount,
    showOnlineBadge,
    isLoading: isLoading && !hasResolvedCount,
    isFetching,
  };
}
