import type { ApiResponse } from "@/features/profile-setup/types/profile-setup-api.types";

export type RoomCategoryDto = {
  id: string;
  slug: string;
  displayName: string;
  emoji: string | null;
  description: string | null;
  sortOrder: number;
};

export type ListCircleCategoriesData = {
  categories: RoomCategoryDto[];
};

export type ListCircleCategoriesApiResponse =
  ApiResponse<ListCircleCategoriesData>;

export type CreateCircleAdvancedOptions = {
  shouldHostStartMeeting?: boolean;
  shouldMeetingAutoStart?: boolean;
  circleExpirationMinutes?: number | null;
  deleteCircleAfterCall?: boolean;
  hostControlsActiveSpeaker?: boolean;
};

export type CreateCircleRequest = {
  /** Omit or `circle` for group circles; `direct` for 1:1-style rooms. */
  roomType?: "direct" | "circle";
  categoryId: string;
  title: string;
  description?: string;
  visibility: "private" | "public";
  maxParticipants: number;
  scheduleMode: "instant" | "scheduled";
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  advancedOptions?: CreateCircleAdvancedOptions;
  /** Must be user IDs you share an accepted connection with */
  invitedUserIds?: string[];
};

export type CreateCircleResult = {
  room: {
    id: string;
    status: string;
    inviteCode: string | null;
    scheduledStartAt: string | null;
    startedAt: string | null;
    roomType: "direct" | "circle";
  };
  category: Pick<RoomCategoryDto, "id" | "slug" | "displayName" | "emoji">;
  friendInvitesCreated: number;
};

export type CreateCircleApiResponse = ApiResponse<CreateCircleResult>;

// ─── Active Circles ──────────────────────────────────────────────────────────

export type ActiveCircleItem = {
  id: string;
  title: string;
  status: "live" | "scheduled";
  visibility: "public" | "private";
  maxParticipants: number;
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

export type ActiveCirclesData = {
  friendInvited: FriendInvitedCircleItem[];
  joined: ActiveCircleItem[];
  public: {
    items: ActiveCircleItem[];
    nextCursor: string | null;
    hasMore: boolean;
  };
};

export type ActiveCirclesApiResponse = ApiResponse<ActiveCirclesData>;
