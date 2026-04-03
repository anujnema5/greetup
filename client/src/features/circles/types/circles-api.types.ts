import type { ApiResponse } from "@/features/profile-setup/types/profile-setup-api.types";

export type CircleCategoryDto = {
  id: string;
  slug: string;
  displayName: string;
  emoji: string | null;
  description: string | null;
  sortOrder: number;
};

export type ListCircleCategoriesData = {
  categories: CircleCategoryDto[];
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
  category: Pick<CircleCategoryDto, "id" | "slug" | "displayName" | "emoji">;
  friendInvitesCreated: number;
};

export type CreateCircleApiResponse = ApiResponse<CreateCircleResult>;
