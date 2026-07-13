export type BlockUserMutationArg = {
  targetUserId: string;
  peerUsername?: string | null;
  /** When blocking from an open DM, refreshes that thread immediately. */
  conversationId?: string | null;
};

export type BlockedUserListItem = {
  userId: string;
  username: string;
  displayName: string | null;
  name: string;
  image: string | null;
  blockedAt: string;
};

export type BlockedUsersListData = {
  items: BlockedUserListItem[];
};

export type BlockUserPeer = {
  userId: string;
  username: string;
  displayTitle: string;
  primaryImage: string | null;
};
