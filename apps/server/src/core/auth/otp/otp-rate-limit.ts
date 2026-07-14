import { createHash } from "node:crypto";

import { consumeRateLimit } from "@/core/rate-limit";
import { getRedis } from "@/core/redis";
import {
  PHONE_OTP_KEYS,
  PHONE_OTP_MAX_SENDS_PER_HOUR,
  PHONE_OTP_MAX_SENDS_PER_IP_PER_HOUR,
  PHONE_OTP_RESEND_COOLDOWN_SEC,
  PHONE_OTP_SEND_WINDOW_SEC,
} from "@/core/redis/keys";

export type OtpSendGate =
  | { allowed: true }
  | { allowed: false; reason: "cooldown" | "phone_limit" | "ip_limit"; retryAfterSec: number };

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/**
 * Gate an OTP send request. Without Firebase's reCAPTCHA this is the primary defense against
 * SMS-pumping cost abuse, so it layers three limits:
 *  - a short per-number resend cooldown (SET NX EX),
 *  - a per-number hourly cap,
 *  - a per-IP hourly cap (blunts enumeration across many numbers).
 * The cooldown key is only claimed once all caps pass, so a rejected request never extends it.
 */
export async function checkOtpSendAllowed(e164Phone: string, ip: string): Promise<OtpSendGate> {
  const redis = getRedis();
  const cooldownKey = `${PHONE_OTP_KEYS.code(e164Phone)}:cooldown`;

  const cooldownTtl = await redis.ttl(cooldownKey);
  if (cooldownTtl > 0) {
    return { allowed: false, reason: "cooldown", retryAfterSec: cooldownTtl };
  }

  const perPhone = await consumeRateLimit({
    key: PHONE_OTP_KEYS.sendCountByPhone(e164Phone),
    limit: PHONE_OTP_MAX_SENDS_PER_HOUR,
    windowSec: PHONE_OTP_SEND_WINDOW_SEC,
  });
  if (!perPhone.allowed) {
    return { allowed: false, reason: "phone_limit", retryAfterSec: perPhone.retryAfterSec };
  }

  const perIp = await consumeRateLimit({
    key: PHONE_OTP_KEYS.sendCountByIp(hashIp(ip)),
    limit: PHONE_OTP_MAX_SENDS_PER_IP_PER_HOUR,
    windowSec: PHONE_OTP_SEND_WINDOW_SEC,
  });
  if (!perIp.allowed) {
    return { allowed: false, reason: "ip_limit", retryAfterSec: perIp.retryAfterSec };
  }

  await redis.set(cooldownKey, "1", "EX", PHONE_OTP_RESEND_COOLDOWN_SEC);
  return { allowed: true };
}
