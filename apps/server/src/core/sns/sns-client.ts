/**
 * Lazy AWS SNS client for phone OTP SMS delivery.
 *
 * SNS only transports the SMS — the OTP itself is generated and verified server-side
 * (see `core/auth/otp`). Credentials are optional at boot so non-phone flows still run
 * without AWS configured; `getSnsClient` throws a clear error only when SMS is actually sent.
 */

import { SNSClient } from "@aws-sdk/client-sns";

import appConfig from "@/shared/config/config";

let client: SNSClient | null = null;

export function isSnsConfigured(): boolean {
  return Boolean(
    appConfig.awsSnsRegion && appConfig.awsAccessKeyId && appConfig.awsSecretAccessKey,
  );
}

export function getSnsClient(): SNSClient {
  if (!isSnsConfigured()) {
    throw new Error(
      "[sns] AWS SNS is not configured. Set AWS_SNS_REGION, AWS_ACCESS_KEY_ID and " +
        "AWS_SECRET_ACCESS_KEY to send phone OTP SMS.",
    );
  }
  if (!client) {
    client = new SNSClient({
      region: appConfig.awsSnsRegion!,
      credentials: {
        accessKeyId: appConfig.awsAccessKeyId!,
        secretAccessKey: appConfig.awsSecretAccessKey!,
      },
    });
  }
  return client;
}
