import type { RoomSessionType } from "@/shared/types/room-session";

/** Successful RTC JWT payload from `GET /room/:id/rtc-token` (after unwrap). */
export type RtcTokenPayload = {
  token: string;
  expiresInSec: number;
  roomId: string;
  roomType: RoomSessionType;
  /** Chat conversation linked to this room — always present after issue-rtc-token. */
  conversationId: string;
};

/** Raw JSON envelope from the API before `transformResponse`. */
export type RtcTokenApiResponse = {
  success?: boolean;
  data?: RtcTokenPayload;
  message?: string;
};

/** Normalized RTC token query state consumed by RTC provider/UI. */
export type RoomRtcState = {
  rtcToken: string | null;
  rtcTokenExpiresInSec: number | null;
  rtcTokenLoading: boolean;
  rtcTokenError: string | null;
  rtcTokenErrorCode: string | null;
  rtcTokenSkipped: boolean;
  /** No-op when `rtcTokenSkipped` is true. */
  refetchRtcToken: () => void;
};
