/**
 * DigitalOcean Spaces (S3) — profile image upload constants.
 */

/** Presigned PUT lifetime (seconds). */
export const PROFILE_IMAGE_PRESIGN_TTL_SECONDS = 600;

/** Stored on the object; browsers and CDNs can cache aggressively. */
export const PROFILE_IMAGE_CACHE_CONTROL =
  "public, max-age=31536000, immutable";

export const DEFAULT_PROFILE_IMAGES_KEY_PREFIX = "profile-images";

/** MIME types accepted for profile image presign + client upload. */
export const PROFILE_IMAGE_ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type ProfileImageContentType =
  (typeof PROFILE_IMAGE_ALLOWED_CONTENT_TYPES)[number];

const MIME_TO_EXT: Record<ProfileImageContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function fileExtensionForProfileImageContentType(
  contentType: string
): string | undefined {
  return MIME_TO_EXT[contentType as ProfileImageContentType];
}
