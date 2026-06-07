import type {
  ListRoomEmbeddedActivitiesApiResponse,
  RoomEmbeddedActivityDto,
} from "@/features/room/embedded-activities/types";

type EmbeddedActivitiesEnvelope = {
  success: boolean;
  data?: RoomEmbeddedActivityDto[] | null;
  message?: string;
};

/** Unwraps API envelope for embedded activities list responses. */
export function parseListRoomEmbeddedActivitiesResponse(
  response: EmbeddedActivitiesEnvelope | ListRoomEmbeddedActivitiesApiResponse,
): RoomEmbeddedActivityDto[] {
  if (!response.success || response.data == null) {
    throw new Error(response.message ?? "Could not load room activities");
  }
  return response.data;
}
