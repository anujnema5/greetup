"use client";

import {
  useAcceptedConnectionsInfiniteQuery,
  useGetMyConnectionsQuery,
} from "../api/connections-api";

const ACCEPTED_PAGE_SIZE = 20;

/** Matches `ProfileConnectionsSection` page queries — avoids duplicate cache keys. */
export function useConnectionsPageListLoading() {
  const incoming = useGetMyConnectionsQuery(
    { filter: "pending_incoming" },
    { refetchOnMountOrArgChange: true, refetchOnFocus: true, refetchOnReconnect: true },
  );
  const outgoing = useGetMyConnectionsQuery(
    { filter: "pending_outgoing" },
    { refetchOnMountOrArgChange: true, refetchOnFocus: true, refetchOnReconnect: true },
  );
  const acceptedInfinite = useAcceptedConnectionsInfiniteQuery(
    { limit: ACCEPTED_PAGE_SIZE, q: undefined },
    { refetchOnMountOrArgChange: true },
  );

  return incoming.isLoading || outgoing.isLoading || acceptedInfinite.isLoading;
}
