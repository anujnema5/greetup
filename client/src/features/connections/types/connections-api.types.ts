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
};

export type ListConnectionsApiResponse = ApiResponse<ListConnectionsData>;
