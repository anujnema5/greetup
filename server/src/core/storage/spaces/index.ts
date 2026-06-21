/**
 * DigitalOcean Spaces (S3-compatible) — profile images and shared helpers.
 */

export {
  DEFAULT_PROFILE_IMAGES_KEY_PREFIX,
  PROFILE_IMAGE_ALLOWED_CONTENT_TYPES,
  PROFILE_IMAGE_CACHE_CONTROL,
  PROFILE_IMAGE_PRESIGN_TTL_SECONDS,
  fileExtensionForProfileImageContentType,
  type ProfileImageContentType,
} from "./constants";

export {
  buildProfileImageObjectKey,
  buildSpacesPublicObjectUrl,
  isSpacesStorageConfigured,
  parseSpacesObjectKeyFromPublicUrl,
  verifyProfileImageKeyForUser,
} from "./spaces.config";

export { getSpacesS3Client } from "./spaces.client";

export {
  ensureProfileImageUrlsArePublic,
  presignProfileImageUpload,
  type ProfileImagePresignResult,
} from "./profile-photo.service";

export {
  isValidReportScreenshotUrl,
  presignReportScreenshotUpload,
  type ReportScreenshotPresignResult,
} from "./report-attachment.service";
