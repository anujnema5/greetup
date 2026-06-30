import type { RoomAdvancedOptions } from "@/core/database/schema";
import type { SpaceActivityTagDto } from "@/modules/session-activities";

export type ActiveSpaceHost = {
  userId: string;
  name: string;
  displayName: string | null;
  image: string | null;
};

export type ActiveSpaceItem = {
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
  host: ActiveSpaceHost;
  /** Session activities tagged on this space (ordered by pick priority). */
  activities: SpaceActivityTagDto[];
};

export type FriendInvitedSpaceItem = ActiveSpaceItem & {
  inviteStatus: "pending" | "accepted";
};

export type ActiveSpacesResult = {
  friendInvited: FriendInvitedSpaceItem[];
  joined: ActiveSpaceItem[];
  public: {
    items: ActiveSpaceItem[];
    nextCursor: string | null;
    hasMore: boolean;
  };
};
