/**
 * Post-upload checks for Spaces image objects (size + MIME).
 */

import { HeadObjectCommand } from "@aws-sdk/client-s3";

import appConfig from "@/shared/config/config";
import { NotFoundError, ValidationError } from "@/shared/errors";

import {
  MAX_UPLOAD_BYTES,
  PROFILE_IMAGE_ALLOWED_CONTENT_TYPES,
} from "./constants";
import { isSpacesStorageConfigured } from "./spaces.config";
import { getSpacesS3Client } from "./spaces.client";

const ALLOWED = new Set<string>(PROFILE_IMAGE_ALLOWED_CONTENT_TYPES);

/**
 * HeadObject and reject missing / oversized / wrong MIME objects.
 */
export async function assertUploadedImageObjectAllowed(key: string): Promise<void> {
  if (!isSpacesStorageConfigured()) {
    throw new ValidationError("Object storage is not configured");
  }

  let head;
  try {
    head = await getSpacesS3Client().send(
      new HeadObjectCommand({
        Bucket: appConfig.doSpacesBucket!,
        Key: key,
      }),
    );
  } catch {
    throw new NotFoundError("Uploaded image not found");
  }

  const size = head.ContentLength ?? 0;
  if (size <= 0 || size > MAX_UPLOAD_BYTES) {
    throw new ValidationError(`Uploaded image must be at most ${MAX_UPLOAD_BYTES} bytes`);
  }

  const contentType = (head.ContentType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ALLOWED.has(contentType)) {
    throw new ValidationError("Uploaded image has an unsupported content type");
  }
}
