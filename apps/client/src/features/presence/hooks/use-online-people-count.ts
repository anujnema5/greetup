"use client";

import { PRESENCE_POLL_INTERVAL_MS } from "../constants";
import { useOnlinePeopleCountQuery } from "../api/presence.queries";

/** Live count of other users online; polls every 15s. */
export function useOnlinePeopleCount() {
  const { data, isLoading, isFetching } = useOnlinePeopleCountQuery({
    refetchInterval: PRESENCE_POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
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
