/**
 * Lazy S3 client for DigitalOcean Spaces (S3-compatible API).
 */

import { S3Client } from "@aws-sdk/client-s3";

import appConfig from "@/shared/config/config";

let client: S3Client | null = null;

/**
 * SDK default `WHEN_SUPPORTED` adds CRC32 to PutObject; that breaks browser presigned PUTs.
 * `WHEN_REQUIRED` keeps presign URLs compatible with `fetch` + file body from the client.
 */
export function getSpacesS3Client(): S3Client {
  if (!client) {
    client = new S3Client({
      region: appConfig.doSpacesRegion!,
      endpoint: appConfig.doSpacesEndpoint!,
      credentials: {
        accessKeyId: appConfig.doSpacesKey!,
        secretAccessKey: appConfig.doSpacesSecret!,
      },
      forcePathStyle: false,
      requestChecksumCalculation: "WHEN_REQUIRED",
    });
  }
  return client;
}
