import type {
  ListRoomEmbeddedActivitiesApiResponse,
  RoomEmbeddedActivityDto,
} from "@/features/room/embedded-activities/types";

/** Unwraps RTK `transformResponse` for `getRoomEmbeddedActivities` in `room-api.ts`. */
export function parseListRoomEmbeddedActivitiesResponse(
  response: ListRoomEmbeddedActivitiesApiResponse,
): RoomEmbeddedActivityDto[] {
  if (!response.success || response.data == null) {
    throw new Error(response.message ?? "Could not load room activities");
  }
  return response.data;
}
