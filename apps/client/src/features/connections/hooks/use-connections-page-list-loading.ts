"use client";

import {
  useAcceptedConnections,
  useMyConnections,
} from "../api/connections.queries";

const ACCEPTED_PAGE_SIZE = 20;

/** Matches `ProfileConnectionsSection` page queries — avoids duplicate cache keys. */
export function useConnectionsPageListLoading() {
  const incoming = useMyConnections({ filter: "pending_incoming" });
  const outgoing = useMyConnections({ filter: "pending_outgoing" });
  const acceptedInfinite = useAcceptedConnections(
    { limit: ACCEPTED_PAGE_SIZE, q: undefined },
    true,
  );

  return incoming.isLoading || outgoing.isLoading || acceptedInfinite.isLoading;
}
