import type { RoomAdvancedOptions } from "@/core/database/schema";

export type ActiveCircleItem = {
  id: string;
  title: string;
  status: "live" | "scheduled";
  visibility: "public" | "private";
  maxParticipants: number;
  description: string | null;
  advancedOptions: RoomAdvancedOptions;
  pendingInviteeIds: string[];
  expiresAt: string | null;
  isExpired: boolean;
  scheduledStartAt: string | null;
  startedAt: string | null;
  participantCount: number;
  category: {
    id: string;
    slug: string;
    displayName: string;
    emoji: string | null;
  };
  host: {
    userId: string;
    name: string;
    displayName: string | null;
  };
};

export type FriendInvitedCircleItem = ActiveCircleItem & {
  inviteStatus: "pending" | "accepted";
};

export type ActiveCirclesResult = {
  friendInvited: FriendInvitedCircleItem[];
  joined: ActiveCircleItem[];
  public: {
    items: ActiveCircleItem[];
    nextCursor: string | null;
    hasMore: boolean;
  };
};
