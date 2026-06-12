import { createHash } from "node:crypto";

/** Stable SHA-256 for device fingerprints and IPs — never store raw values. */
export function hashGuestTrialValue(value: string): string {
  return createHash("sha256").update(value.trim()).digest("hex");
}

/** UTC date `YYYY-MM-DD` for per-day IP counters. */
export function guestTrialUtcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Hash IP for storage — separate salt namespace from device fingerprints. */
export function hashGuestTrialIp(ip: string): string {
  return createHash("sha256").update(`ip:${ip.trim()}`).digest("hex");
}
