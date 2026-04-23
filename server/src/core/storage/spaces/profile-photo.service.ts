/**
 * Profile images: presigned upload + post-upload public ACL (DigitalOcean Spaces).
 */

import {
  CopyObjectCommand,
  PutObjectAclCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

import logger from "@/core/logging";
import appConfig from "@/shared/config/config";
import { ServiceUnavailableError, ValidationError } from "@/shared/errors";

import {
  fileExtensionForProfileImageContentType,
  PROFILE_IMAGE_CACHE_CONTROL,
  PROFILE_IMAGE_PRESIGN_TTL_SECONDS,
} from "./constants";
import {
  buildProfileImageObjectKey,
  buildSpacesPublicObjectUrl,
  isSpacesStorageConfigured,
  parseSpacesObjectKeyFromPublicUrl,
} from "./spaces.config";
import { getSpacesS3Client } from "./spaces.client";

const LOG_PREFIX = "[spaces:profile-images]";

export type ProfileImagePresignResult = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
  /** Client must send this exact `Content-Type` on PUT. */
  contentType: string;
  /**
   * Headers the browser should send on PUT. `x-amz-acl=public-read` is on the presigned query string.
   * We only add `Content-Type` here (avoids extra CORS preflight headers like `Cache-Control` on Spaces).
   */
  uploadHeaders: Record<string, string>;
};

type PresignProfileImageParams = {
  userId: string;
  contentType: string;
};

/**
 * Issue a presigned PUT so the browser uploads directly to Spaces.
 * `ACL` on the command helps; {@link ensureProfileImageUrlsArePublic} reinforces after save.
 */
export async function presignProfileImageUpload(
  params: PresignProfileImageParams
): Promise<ProfileImagePresignResult> {
  if (!isSpacesStorageConfigured()) {
    throw new ServiceUnavailableError(
      "Object storage is not configured (set DO_SPACES_* environment variables)"
    );
  }

  const ext = fileExtensionForProfileImageContentType(params.contentType);
  if (!ext) {
    throw new ValidationError("Unsupported content type");
  }

  const fileName = `${randomUUID()}.${ext}`;
  const key = buildProfileImageObjectKey(params.userId, fileName);
  const bucket = appConfig.doSpacesBucket!;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: params.contentType,
    CacheControl: PROFILE_IMAGE_CACHE_CONTROL,
    ACL: "public-read",
  });

  const client = getSpacesS3Client();
  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: PROFILE_IMAGE_PRESIGN_TTL_SECONDS,
  });

  const uploadHeaders: Record<string, string> = {
    "Content-Type": params.contentType,
  };

  return {
    uploadUrl,
    publicUrl: buildSpacesPublicObjectUrl(key),
    key,
    expiresIn: PROFILE_IMAGE_PRESIGN_TTL_SECONDS,
    contentType: params.contentType,
    uploadHeaders,
  };
}

/**
 * Apply `public-read` using API keys. Presigned browser PUTs may not leave objects world-readable on Spaces.
 */
export async function ensureProfileImageUrlsArePublic(
  publicUrls: string[]
): Promise<void> {
  if (!isSpacesStorageConfigured() || publicUrls.length === 0) return;

  const keys = new Set<string>();
  for (const url of publicUrls) {
    const key = parseSpacesObjectKeyFromPublicUrl(url);
    if (key) keys.add(key);
  }
  if (keys.size === 0) return;

  const s3 = getSpacesS3Client();
  const bucket = appConfig.doSpacesBucket!;

  await Promise.allSettled(
    [...keys].map(async (Key) => {
      try {
        await s3.send(
          new PutObjectAclCommand({
            Bucket: bucket,
            Key,
            ACL: "public-read",
          }),
        );
        return;
      } catch (err) {
        logger.warn(`${LOG_PREFIX} PutObjectAcl failed`, {
          Key,
          err: String(err),
        });
      }
      try {
        await s3.send(
          new CopyObjectCommand({
            Bucket: bucket,
            Key,
            CopySource: `${bucket}/${Key}`,
            ACL: "public-read",
            MetadataDirective: "COPY",
          }),
        );
      } catch (err) {
        logger.warn(
          `${LOG_PREFIX} CopyObject+ACL failed (Spaces may have ACLs disabled). Add a bucket policy allowing s3:GetObject for your profile-images prefix.`,
          { Key, err: String(err) },
        );
      }
    }),
  );
}
