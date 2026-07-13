import type { RoomActivityId } from "@/features/room/types/call/room-activity.types";

/**
 * One row of `room_embedded_activities` from `GET /api/room/embedded-activities`.
 * Field names follow the Drizzle schema (`room-embedded-activities.ts` on the server).
 */
export type RoomEmbeddedActivityDto = {
  slug: RoomActivityId;
  displayLabel: string;
  emoji: string;
  isActive: boolean;
  hidePeopleTab: boolean;
  blockParticipantInvites: boolean;
  suppressPeoplePanelCameras: boolean;
  inviteBlockedMessage: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** Standard Hono `ApiResponse` envelope for the list endpoint. */
export type ListRoomEmbeddedActivitiesApiResponse = {
  success: boolean;
  data: RoomEmbeddedActivityDto[] | null;
  message?: string;
};
