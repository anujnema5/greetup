/**
 * RTC token (mediasoup / rtc-service) — RTK Query on `baseApi`.
 *
 * - Types: `types/rtc-api.types.ts`
 * - Endpoint: `api/rtc-api.ts`
 */

export { rtcApi, useGetRtcTokenQuery } from "./api/rtc-api";
export type { RtcTokenApiResponse, RtcTokenPayload } from "./types/rtc-api.types";
export { useRtcSocket } from "./hooks/use-rtc-socket";
export type { RtcSocketState, UseRtcSocketReturn } from "./hooks/use-rtc-socket";
export {
  RtcSocketProvider,
  useRtcSocketContext,
} from "./providers/rtc-socket-provider";
export type { RtcSocketContextValue } from "./providers/rtc-socket-provider";
