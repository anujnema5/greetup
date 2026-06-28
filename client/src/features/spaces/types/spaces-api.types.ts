import type { ApiResponse } from "@/features/profile-setup/types/profile-setup-api.types";
import type { RoomSessionType } from "@/shared/types/room-session";

export type RoomCategoryDto = {
  id: string;
  slug: string;
  displayName: string;
  emoji: string | null;
  description: string | null;
  sortOrder: number;
};

export type ListSpaceCategoriesData = {
  categories: RoomCategoryDto[];
};

export type ListSpaceCategoriesApiResponse =
  ApiResponse<ListSpaceCategoriesData>;

export type CreateSpaceAdvancedOptions = {
  shouldHostStartMeeting?: boolean;
  shouldMeetingAutoStart?: boolean;
  spaceExpirationMinutes?: number | null;
  deleteSpaceAfterCall?: boolean;
  hostControlsActiveSpeaker?: boolean;
};

export type CreateSpaceRequest = {
  /** Omit or `space` for group spaces; `direct` for 1:1-style rooms. */
  roomType?: RoomSessionType;
  categoryId: string;
  title: string;
  description?: string;
  visibility: "private" | "public";
  maxParticipants: number;
  scheduleMode: "instant" | "scheduled";
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  advancedOptions?: CreateSpaceAdvancedOptions;
  /** Must be user IDs you share an accepted connection with */
  invitedUserIds?: string[];
};

export type CreateSpaceResult = {
  room: {
    id: string;
    status: string;
    inviteCode: string | null;
    scheduledStartAt: string | null;
    startedAt: string | null;
    roomType: RoomSessionType;
  };
  category: Pick<RoomCategoryDto, "id" | "slug" | "displayName" | "emoji">;
  friendInvitesCreated: number;
};

export type CreateSpaceApiResponse = ApiResponse<CreateSpaceResult>;

// ─── Active spaces ───────────────────────────────────────────────────────────

export type ActiveSpaceItem = {
  id: string;
  title: string;
  status: "live" | "scheduled";
  visibility: "public" | "private";
  maxParticipants: number;
  description: string | null;
  advancedOptions: CreateSpaceAdvancedOptions;
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

export type FriendInvitedSpaceItem = ActiveSpaceItem & {
  inviteStatus: "pending" | "accepted";
};

export type ActiveSpacesData = {
  friendInvited: FriendInvitedSpaceItem[];
  joined: ActiveSpaceItem[];
  public: {
    items: ActiveSpaceItem[];
    nextCursor: string | null;
    hasMore: boolean;
  };
};

export type ActiveSpacesApiResponse = ApiResponse<ActiveSpacesData>;

export type UpdateScheduledSpaceRequest = {
  title?: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string | null;
  categoryId?: string;
  description?: string | null;
  visibility?: "private" | "public";
  maxParticipants?: number;
  advancedOptions?: CreateSpaceAdvancedOptions;
  invitedUserIds?: string[];
};

export type UpdateScheduledSpaceResult = {
  room: {
    id: string;
    title: string;
    scheduledStartAt: string | null;
  };
};

export type UpdateScheduledSpaceApiResponse = ApiResponse<UpdateScheduledSpaceResult>;

export type DeleteScheduledSpaceResult = {
  cancelled: true;
};

export type DeleteScheduledSpaceApiResponse = ApiResponse<DeleteScheduledSpaceResult>;
