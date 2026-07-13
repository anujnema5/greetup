import { getApiErrorCode, getApiErrorMessage } from "@/lib/api/fetch-client";
import type { RoomRtcState, RtcTokenPayload } from "@/features/rtc/types/rtc-api.types";

/** Snapshot of RTC token query fields we need (avoids coupling to full hook result type). */
export type RtcTokenQuerySnapshot = {
  data?: RtcTokenPayload;
  error?: unknown;
  isError: boolean;
  isSuccess: boolean;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
};

/**
 * Maps RTC token query state into provider-friendly shape.
 * When `skip` is true (no room / auth not ready), loading and error are suppressed.
 */
export function deriveRoomRtcState(skip: boolean, q: RtcTokenQuerySnapshot): RoomRtcState {
  if (skip) {
    return {
      rtcToken: null,
      rtcTokenExpiresInSec: null,
      rtcTokenLoading: false,
      rtcTokenError: null,
      rtcTokenErrorCode: null,
      rtcTokenSkipped: true,
      refetchRtcToken: () => {},
    };
  }

  const rtcToken = q.isSuccess && q.data ? q.data.token : null;
  const rtcTokenExpiresInSec = q.isSuccess && q.data ? q.data.expiresInSec : null;
  const rtcTokenLoading = !q.isSuccess && !q.isError && (q.isLoading || q.isFetching);
  const rtcTokenError = q.isError
    ? getApiErrorMessage(q.error ?? "Unknown error", "Unknown error")
    : null;
  const rtcTokenErrorCode = q.isError ? getApiErrorCode(q.error ?? null) : null;

  return {
    rtcToken,
    rtcTokenExpiresInSec,
    rtcTokenLoading,
    rtcTokenError,
    rtcTokenErrorCode,
    rtcTokenSkipped: false,
    refetchRtcToken: () => {
      void q.refetch();
    },
  };
}
