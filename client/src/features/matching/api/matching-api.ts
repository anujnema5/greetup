import { API_ENDPOINTS, baseApi } from "@/lib/api";
import { API_BASE_URL } from "@/shared/constants/environments";

import type { FindMatchResponse } from "../types/matching-api.types";

const { MATCHING } = API_ENDPOINTS;

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
  }),
});

export const { useFindMatchMutation, useCancelMatchMutation, useLeaveRoomMutation } = matchingApi;
