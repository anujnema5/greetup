/**
 * RTC — JWT token for joining a live room (mediasoup / rtc-service).
 *
 * `keepUnusedDataFor: 0` avoids holding stale tokens; callers refetch when joining.
 */

import { API_ENDPOINTS, baseApi } from "@/lib/api";

import type { RtcTokenApiResponse, RtcTokenPayload } from "../types/rtc-api.types";

const { ROOM } = API_ENDPOINTS;

// ── Response transform ────────────────────────────────────────────────────────

function toRtcTokenPayload(response: RtcTokenApiResponse): RtcTokenPayload {
  if (response.success && response.data?.token) {
    return response.data;
  }
  throw new Error(response.message ?? "Could not get RTC token");
}

function rtcTokenCacheTag(roomId: string) {
  return { type: "RtcToken" as const, id: roomId };
}

// ── API slice ─────────────────────────────────────────────────────────────────

export const rtcApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getRtcToken: build.query<RtcTokenPayload, string>({
      query: (roomId) => ({ url: ROOM.rtcToken(roomId) }),
      providesTags: (_result, _err, roomId) => [rtcTokenCacheTag(roomId)],
      transformResponse: toRtcTokenPayload,
      keepUnusedDataFor: 0,
    }),
  }),
});

export const { useGetRtcTokenQuery } = rtcApi;
