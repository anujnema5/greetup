export type ConnectionListItem = {
  connectionId: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  /** Present when `status` is `pending`. */
  direction: "incoming" | "outgoing" | null;
  peer: {
    userId: string;
    displayName: string | null;
    name: string;
    image: string | null;
    profileId: string | null;
    /** Public handle when set (for profile links). */
    username: string | null;
  };
  createdAt: string;
};

export type ListMyConnectionsResult = {
  items: ConnectionListItem[];
  /** Present when the request used `limit` (pagination). */
  page?: number;
  limit?: number;
  hasMore?: boolean;
};
