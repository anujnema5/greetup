/**
 * Spaces connection checks and URL/key helpers (no I/O).
 */

import appConfig from "@/shared/config/config";

import { DEFAULT_PROFILE_IMAGES_KEY_PREFIX } from "./constants";

export function isSpacesStorageConfigured(): boolean {
  return Boolean(
    appConfig.doSpacesKey &&
      appConfig.doSpacesSecret &&
      appConfig.doSpacesBucket &&
      appConfig.doSpacesRegion &&
      appConfig.doSpacesEndpoint
  );
}

function normalizeKeyPrefix(prefix: string): string {
  return prefix.replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
}

/**
 * HTTPS URL for an object in this Space (virtual-hosted style or custom CDN base).
 */
export function buildSpacesPublicObjectUrl(objectKey: string): string {
  const base = appConfig.doSpacesPublicBaseUrl?.replace(/\/+$/, "");
  if (base) {
    return `${base}/${objectKey}`;
  }
  const bucket = appConfig.doSpacesBucket!;
  const region = appConfig.doSpacesRegion!;
  return `https://${bucket}.${region}.digitaloceanspaces.com/${objectKey}`;
}

/**
 * Key layout: `{prefix}/{userId}/{uuid}.{ext}` — “folder” is a key prefix.
 */
export function buildProfileImageObjectKey(
  userId: string,
  filename: string
): string {
  const prefix = normalizeKeyPrefix(
    appConfig.doSpacesKeyPrefix ?? DEFAULT_PROFILE_IMAGES_KEY_PREFIX
  );
  const safeName = filename.replace(/^\/+/, "");
  return prefix ? `${prefix}/${userId}/${safeName}` : `${userId}/${safeName}`;
}

/**
 * Extract S3 object key from a URL we issued for this Space (virtual host or `DO_SPACES_PUBLIC_BASE_URL`).
 */
export function parseSpacesObjectKeyFromPublicUrl(
  publicUrl: string
): string | null {
  if (!isSpacesStorageConfigured()) return null;

  const custom = appConfig.doSpacesPublicBaseUrl?.replace(/\/+$/, "");
  if (custom && publicUrl.startsWith(`${custom}/`)) {
    const key = publicUrl.slice(custom.length + 1).split("?")[0];
    return key || null;
  }

  let parsed: URL;
  try {
    parsed = new URL(publicUrl);
  } catch {
    return null;
  }

  const bucket = appConfig.doSpacesBucket!;
  /** `{bucket}.{region}.digitaloceanspaces.com` — only bucket must match so we still resolve keys if region slug matches the Space. */
  const hostMatch = parsed.hostname.match(/^([^.]+)\.([^.]+)\.digitaloceanspaces\.com$/);
  if (!hostMatch || hostMatch[1] !== bucket) return null;

  const key = parsed.pathname.replace(/^\/+/, "").split("?")[0];
  return key || null;
}

/** True if `key` is under this app’s profile-images layout for `userId`. */
export function verifyProfileImageKeyForUser(key: string, userId: string): boolean {
  const prefix = normalizeKeyPrefix(
    appConfig.doSpacesKeyPrefix ?? DEFAULT_PROFILE_IMAGES_KEY_PREFIX,
  );
  if (prefix) {
    return key.startsWith(`${prefix}/${userId}/`);
  }
  return key.startsWith(`${userId}/`);
}
