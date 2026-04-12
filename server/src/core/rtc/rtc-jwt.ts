import { SignJWT, type JWTPayload } from "jose";
import config from "@/shared/config/config";
import type { RoomSessionType } from "@/shared/types/room-session";

const ALG = "HS256";

/** Alias for JWT claim `roomType` — same as `RoomSessionType`. */
export type RtcJwtRoomType = RoomSessionType;

function getSecret(): Uint8Array {
  const raw = config.rtcJwtSecret;
  if (!raw || raw.length < 16) {
    throw new Error("RTC_JWT_SECRET is missing or too short (min 16 chars)");
  }
  return new TextEncoder().encode(raw);
}

export type RtcJwtClaims = JWTPayload & {
  roomId: string;
  roomType: RoomSessionType;
};

/**
 * Short-lived JWT for rtc-service Socket.IO; verified with the same `RTC_JWT_SECRET`.
 */
export async function signRtcJwtForRoom(params: {
  userId: string;
  roomId: string;
  roomType: RoomSessionType;
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
