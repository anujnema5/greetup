/**
 * RTC token (mediasoup / rtc-service) — RTK Query on `baseApi`.
 *
 * - Types: `types/rtc-api.types.ts`
 * - Endpoint: `api/rtc-api.ts`
 */

export { rtcApi, useGetRtcTokenQuery } from "./api/rtc-api";
export type { RtcTokenApiResponse, RtcTokenPayload } from "./types/rtc-api.types";
