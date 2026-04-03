import { SignJWT, type JWTPayload } from "jose";
import config from "@/shared/config/config";

const ALG = "HS256";

/** Claim value for `roomType` — matches DB `room_type` enum. */
export type RtcJwtRoomType = "direct" | "circle";

function getSecret(): Uint8Array {
  const raw = config.rtcJwtSecret;
  if (!raw || raw.length < 16) {
    throw new Error("RTC_JWT_SECRET is missing or too short (min 16 chars)");
  }
  return new TextEncoder().encode(raw);
}

export type RtcJwtClaims = JWTPayload & {
  roomId: string;
  roomType: RtcJwtRoomType;
};

/**
 * Short-lived JWT for rtc-service Socket.IO; verified with the same `RTC_JWT_SECRET`.
 */
export async function signRtcJwtForRoom(params: {
  userId: string;
  roomId: string;
  roomType: RtcJwtRoomType;
  expiresInSec?: number;
}): Promise<{ token: string; expiresInSec: number }> {
  const expiresInSec = params.expiresInSec ?? 15 * 60;
  const secret = getSecret();

  const token = await new SignJWT({
    roomId: params.roomId,
    roomType: params.roomType,
  } satisfies Pick<RtcJwtClaims, "roomId" | "roomType">)
    .setProtectedHeader({ alg: ALG })
    .setSubject(params.userId)
    .setIssuedAt()
    .setExpirationTime(`${expiresInSec}s`)
    .sign(secret);

  return { token, expiresInSec };
}
