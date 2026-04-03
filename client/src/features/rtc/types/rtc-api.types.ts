/** Successful RTC JWT payload from `GET /room/:id/rtc-token` (after unwrap). */
export type RtcTokenPayload = {
  token: string;
  expiresInSec: number;
  roomId: string;
  roomType: "direct" | "circle";
};

/** Raw JSON envelope from the API before `transformResponse`. */
export type RtcTokenApiResponse = {
  success?: boolean;
  data?: RtcTokenPayload;
  message?: string;
};
