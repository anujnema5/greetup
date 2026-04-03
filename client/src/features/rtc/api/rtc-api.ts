import { API_ENDPOINTS, baseApi } from "@/lib/api";

import type { RtcTokenApiResponse, RtcTokenPayload } from "../types/rtc-api.types";

const { ROOM } = API_ENDPOINTS;

export const rtcApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getRtcToken: build.query<RtcTokenPayload, string>({
      query: (roomId) => ({ url: ROOM.rtcToken(roomId) }),
      transformResponse: (response: RtcTokenApiResponse): RtcTokenPayload => {
        if (response.success && response.data?.token) {
          return response.data;
        }
        throw new Error(response.message ?? "Could not get RTC token");
      },
      keepUnusedDataFor: 0,
    }),
  }),
});

export const { useGetRtcTokenQuery } = rtcApi;
