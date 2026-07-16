import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import { getRedis } from "@/core/redis";
import { PHONE_OTP_KEYS } from "@/core/redis/keys";
import config from "@/shared/config/config";

import { digitsOnlyOtp } from "./otp-format";

export type VerifyOtpResult =
  | { status: "ok" }
  | { status: "not_found" }
  | { status: "mismatch"; attemptsLeft: number }
  | { status: "too_many_attempts" };

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/** Constant-time compare of two hex digests (equal length by construction). */
function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/** Cryptographically-uniform N-digit code (zero-padded), e.g. "042915". */
function generateCode(length: number): string {
  const max = 10 ** length;
  return randomInt(0, max).toString().padStart(length, "0");
}

/**
 * Generate a fresh OTP for `e164Phone`, store only its hash (+ attempt counter) in Redis with
 * a TTL, and return the plaintext code to hand to SNS. Overwrites any previous live code for
 * the number, so requesting a new code invalidates the old one.
 */
export async function createOtp(e164Phone: string): Promise<string> {
  const code = generateCode(config.otpLength);
  const key = PHONE_OTP_KEYS.code(e164Phone);
  const redis = getRedis();
  await redis
    .multi()
    .del(key)
    .hset(key, { codeHash: hashCode(code), attempts: 0 })
    .expire(key, config.otpTtlSec)
    .exec();
  return code;
}

/**
 * Verify a submitted code against the stored hash. Single-use (deletes on success), enforces
 * `otpMaxAttempts`, and returns a discriminated result. Expiry is handled by the Redis TTL —
 * an expired/never-issued code both read as `not_found` (caller shows a generic message).
 */
export async function verifyOtp(e164Phone: string, rawCode: string): Promise<VerifyOtpResult> {
  const code = digitsOnlyOtp(rawCode);
  const key = PHONE_OTP_KEYS.code(e164Phone);
  const redis = getRedis();

  const stored = await redis.hgetall(key);
  if (!stored || !stored.codeHash) {
    return { status: "not_found" };
  }

  const attempts = Number.parseInt(stored.attempts ?? "0", 10) || 0;
  if (attempts >= config.otpMaxAttempts) {
    await redis.del(key);
    return { status: "too_many_attempts" };
  }

  if (safeEqualHex(hashCode(code), stored.codeHash)) {
    await redis.del(key);
    return { status: "ok" };
  }

  const newAttempts = await redis.hincrby(key, "attempts", 1);
  if (newAttempts >= config.otpMaxAttempts) {
    await redis.del(key);
    return { status: "too_many_attempts" };
  }
  return { status: "mismatch", attemptsLeft: config.otpMaxAttempts - newAttempts };
}
