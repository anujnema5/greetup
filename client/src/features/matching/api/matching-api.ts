import { API_ENDPOINTS, baseApi } from "@/lib/api";
import { API_BASE_URL } from "@/shared/constants/environments";

import type { FindMatchResponse } from "../types/matching-api.types";
import { parseRoomData, type RoomData } from "../types/room.types";

const { MATCHING, ROOM } = API_ENDPOINTS;

type RoomGetApiResponse = {
  success: boolean;
  data?: unknown;
  message?: string;
};

/** Fire-and-forget for tab close / refresh; session cookie identifies the user. */
export function leaveRoomKeepalive(): void {
  if (typeof window === "undefined") return;
  void fetch(`${API_BASE_URL}${MATCHING.LEAVE_ROOM}`, {
    method: "POST",
    credentials: "include",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}

export const matchingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    findMatch: build.mutation<FindMatchResponse, void>({
      query: () => ({
        url: MATCHING.FIND,
        method: "POST",
      }),
    }),
    cancelMatch: build.mutation<void, void>({
      query: () => ({
        url: MATCHING.CANCEL,
        method: "POST",
      }),
    }),
    leaveRoom: build.mutation<void, void>({
      query: () => ({
        url: MATCHING.LEAVE_ROOM,
        method: "POST",
      }),
    }),
    /** GET `/room/:roomId` — Redis match pair or DB room metadata. */
    getRoom: build.query<RoomData, string>({
      query: (roomId) => ({ url: ROOM.get(roomId) }),
      transformResponse: (response: RoomGetApiResponse): RoomData => {
        if (!response.success || response.data == null) {
          throw new Error(response.message ?? "Room not found");
        }
        return parseRoomData(response.data);
      },
    }),
  }),
});

export const {
  useFindMatchMutation,
  useCancelMatchMutation,
  useLeaveRoomMutation,
  useGetRoomQuery,
} = matchingApi;
