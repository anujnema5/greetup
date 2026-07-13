/**
 * Problem-report screenshots: presigned upload (DigitalOcean Spaces).
 * Reuses the shared Spaces client and image-MIME helpers; only the key prefix differs
 * from profile images so report attachments live under their own "folder".
 */

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

import appConfig from "@/shared/config/config";
import { ServiceUnavailableError, ValidationError } from "@/shared/errors";

import {
  fileExtensionForProfileImageContentType,
  MAX_UPLOAD_BYTES,
  PROFILE_IMAGE_PRESIGN_TTL_SECONDS,
} from "./constants";
import {
  buildSpacesPublicObjectUrl,
  isSpacesStorageConfigured,
  parseSpacesObjectKeyFromPublicUrl,
} from "./spaces.config";
import { getSpacesS3Client } from "./spaces.client";

/** Key prefix for report screenshots, e.g. `problem-reports/{userId}/{uuid}.png`. */
const REPORT_ATTACHMENTS_PREFIX = "problem-reports";

export type ReportScreenshotPresignResult = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
  /** Client must send this exact `Content-Type` on PUT. */
  contentType: string;
  uploadHeaders: Record<string, string>;
};

function buildReportAttachmentKey(userId: string, filename: string): string {
  return `${REPORT_ATTACHMENTS_PREFIX}/${userId}/${filename.replace(/^\/+/, "")}`;
}

/** Issue a presigned PUT so the browser uploads a screenshot directly to Spaces. */
export async function presignReportScreenshotUpload(params: {
  userId: string;
  contentType: string;
  contentLength: number;
}): Promise<ReportScreenshotPresignResult> {
  if (!isSpacesStorageConfigured()) {
    throw new ServiceUnavailableError(
      "Object storage is not configured (set DO_SPACES_* environment variables)",
    );
  }

  if (
    !Number.isInteger(params.contentLength) ||
    params.contentLength <= 0 ||
    params.contentLength > MAX_UPLOAD_BYTES
  ) {
    throw new ValidationError(`File must be between 1 and ${MAX_UPLOAD_BYTES} bytes`);
  }

  const ext = fileExtensionForProfileImageContentType(params.contentType);
  if (!ext) {
    throw new ValidationError("Unsupported content type");
  }

  const key = buildReportAttachmentKey(params.userId, `${randomUUID()}.${ext}`);
  const command = new PutObjectCommand({
    Bucket: appConfig.doSpacesBucket!,
    Key: key,
    ContentType: params.contentType,
    ContentLength: params.contentLength,
    ACL: "public-read",
  });

  const uploadUrl = await getSignedUrl(getSpacesS3Client(), command, {
    expiresIn: PROFILE_IMAGE_PRESIGN_TTL_SECONDS,
  });

  return {
    uploadUrl,
    publicUrl: buildSpacesPublicObjectUrl(key),
    key,
    expiresIn: PROFILE_IMAGE_PRESIGN_TTL_SECONDS,
    contentType: params.contentType,
    uploadHeaders: {
      "Content-Type": params.contentType,
    },
  };
}

/**
 * True if `publicUrl` is one we issued for this user's report attachments.
 * Guards against a client submitting an arbitrary URL as its screenshot.
 */
export function isValidReportScreenshotUrl(publicUrl: string, userId: string): boolean {
  const key = parseSpacesObjectKeyFromPublicUrl(publicUrl);
  return Boolean(key && key.startsWith(`${REPORT_ATTACHMENTS_PREFIX}/${userId}/`));
}
