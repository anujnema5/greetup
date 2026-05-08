import { getRtkQueryErrorMessage } from "@/lib/api/rtk-query-error";
import type { RoomRtcState, RtcTokenPayload } from "@/features/rtc/types/rtc-api.types";

/** Snapshot of `useGetRtcTokenQuery` fields we need (avoids coupling to full hook result type). */
export type RtcTokenQuerySnapshot = {
  data?: RtcTokenPayload;
  error?: unknown;
  isError: boolean;
  isSuccess: boolean;
  isLoading: boolean;
  isFetching: boolean;
};

/**
 * Maps RTK Query RTC token state into provider-friendly shape.
 * When `skip` is true (no room / auth not ready), loading and error are suppressed.
 */
export function deriveRoomRtcState(skip: boolean, q: RtcTokenQuerySnapshot): RoomRtcState {
  if (skip) {
    return {
      rtcToken: null,
      rtcTokenExpiresInSec: null,
      rtcTokenLoading: false,
      rtcTokenError: null,
      rtcTokenSkipped: true,
    };
  }

  const rtcToken = q.isSuccess && q.data ? q.data.token : null;
  const rtcTokenExpiresInSec = q.isSuccess && q.data ? q.data.expiresInSec : null;
  const rtcTokenLoading = !q.isSuccess && !q.isError && (q.isLoading || q.isFetching);
  const rtcTokenError = q.isError ? getRtkQueryErrorMessage(q.error ?? "Unknown error") : null;

  return {
    rtcToken,
    rtcTokenExpiresInSec,
    rtcTokenLoading,
    rtcTokenError,
    rtcTokenSkipped: false,
  };
}
