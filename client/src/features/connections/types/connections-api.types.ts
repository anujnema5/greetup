import type { ApiResponse } from "@/features/profile-setup/types/profile-setup-api.types";

export type ConnectionListFilter =
  | "accepted"
  | "pending_incoming"
  | "pending_outgoing";

export type ConnectionPeer = {
  userId: string;
  displayName: string | null;
  name: string;
  image: string | null;
  profileId: string | null;
  username: string | null;
};

export type ConnectionListItem = {
  connectionId: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  direction: "incoming" | "outgoing" | null;
  peer: ConnectionPeer;
  createdAt: string;
};

export type ListConnectionsData = {
  items: ConnectionListItem[];
  page?: number;
  limit?: number;
  hasMore?: boolean;
};

export type ListConnectionsApiResponse = ApiResponse<ListConnectionsData>;

export type PendingIncomingCountResponse = ApiResponse<{ pendingIncomingCount: number }>;

export type PeerCallStatusEntry = {
  isOnline: boolean;
  inLiveRoom: boolean;
  liveRoomId: string | null;
  liveRoomTitle: string | null;
};

export type PeersCallStatusApiResponse = ApiResponse<{ statuses: Record<string, PeerCallStatusEntry> }>;

/** Client-only: RTK cache invalidation for `getPublicProfile` after connect. */
export type RequestConnectionMutationArg = {
  targetUserId: string;
  invalidatePublicProfileUsername?: string;
};

export type RequestConnectionResult = {
  success: boolean;
  data?: { status: "accepted" | "pending"; connectionId?: string };
  message?: string;
};

/** Accept or reject an incoming pending connection (RTK cache invalidation). */
export type RespondConnectionMutationArg = {
  connectionId: string;
  peerUsername?: string | null;
};
