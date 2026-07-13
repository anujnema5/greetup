/**
 * Lightweight guest device fingerprint (v1).
 *
 * Payload: stable local id + coarse environment hints. The server SHA-256 hashes this
 * string — never store or log the raw value outside the guest create request body.
 *
 * @see docs/temp/guest-trial-architecture.md §10.1
 */

const DEVICE_ID_STORAGE_KEY = "greetup_guest_device_id";

/** Mirrors `createGuestSessionBodySchema` max on the server. */
export const DEVICE_FINGERPRINT_MAX_LENGTH = 512;

const UA_MAX_LENGTH = 120;

export type DeviceFingerprintPayload = {
  localId: string;
  userAgent: string;
  screen: string;
  timeZone: string;
  language: string;
};

let inMemoryDeviceId: string | null = null;

function createLocalDeviceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `fp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function readStoredDeviceId(): string | null {
  if (typeof window === "undefined") {
    return inMemoryDeviceId;
  }

  try {
    const fromLocal = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (fromLocal) {
      return fromLocal;
    }
  } catch {
    /* private mode / blocked storage */
  }

  try {
    const fromSession = sessionStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (fromSession) {
      return fromSession;
    }
  } catch {
    /* ignore */
  }

  return inMemoryDeviceId;
}

function writeStoredDeviceId(localId: string): void {
  inMemoryDeviceId = localId;

  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, localId);
    return;
  } catch {
    /* fall through */
  }

  try {
    sessionStorage.setItem(DEVICE_ID_STORAGE_KEY, localId);
  } catch {
    /* in-memory only for this tab */
  }
}

function getOrCreateLocalDeviceId(): string {
  const existing = readStoredDeviceId();
  if (existing) {
    return existing;
  }

  const localId = createLocalDeviceId();
  writeStoredDeviceId(localId);
  return localId;
}

function readBrowserFingerprintParts(): Omit<DeviceFingerprintPayload, "localId"> {
  if (typeof window === "undefined") {
    return {
      userAgent: "server",
      screen: "0x0",
      timeZone: "unknown",
      language: "unknown",
    };
  }

  return {
    userAgent: navigator.userAgent.slice(0, UA_MAX_LENGTH),
    screen: `${window.screen.width}x${window.screen.height}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "unknown",
    language: navigator.language?.slice(0, 16) ?? "unknown",
  };
}

/**
 * Pure builder — used by {@link getOrCreateDeviceFingerprint} and tests.
 * Format: `localId|userAgent|screen|timeZone|language`
 */
export function buildDeviceFingerprintString(payload: DeviceFingerprintPayload): string {
  const raw = [
    payload.localId,
    payload.userAgent,
    payload.screen,
    payload.timeZone,
    payload.language,
  ].join("|");

  if (raw.length <= DEVICE_FINGERPRINT_MAX_LENGTH) {
    return raw;
  }

  return raw.slice(0, DEVICE_FINGERPRINT_MAX_LENGTH);
}

/**
 * Eagerly creates/persists the local device id on `/try` mount so guest create is fast.
 */
export function warmDeviceFingerprint(): void {
  getOrCreateLocalDeviceId();
}

/**
 * Stable client id + coarse environment hints for guest abuse tracking (hashed server-side).
 * Send on `POST /auth/guest` as `deviceFingerprint`.
 */
export function getOrCreateDeviceFingerprint(): string {
  const localId = getOrCreateLocalDeviceId();
  return buildDeviceFingerprintString({
    localId,
    ...readBrowserFingerprintParts(),
  });
}
