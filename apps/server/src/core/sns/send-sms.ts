import { PublishCommand } from "@aws-sdk/client-sns";

import logger from "@/core/logging";
import config from "@/shared/config/config";

import { getSnsClient } from "./sns-client";

/**
 * Thrown when SNS delivery fails. Callers should surface a generic "couldn't send code"
 * to the client and never leak the underlying AWS error.
 */
export class SmsDeliveryError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "SmsDeliveryError";
  }
}

/**
 * Send a one-time phone OTP over SNS as a Transactional SMS (higher delivery priority than
 * Promotional). `AWS.SNS.SMS.SenderID` is applied only where supported — SNS ignores it in
 * regions like the US/CA that require a registered origination number instead.
 */
export async function sendOtpSms(e164Phone: string, code: string): Promise<void> {
  const message = `${code} is your Greetup verification code. It expires in ${Math.round(
    config.otpTtlSec / 60,
  )} minutes. Do not share it with anyone.`;

  const messageAttributes: Record<string, { DataType: string; StringValue: string }> = {
    "AWS.SNS.SMS.SMSType": { DataType: "String", StringValue: "Transactional" },
  };
  if (config.awsSnsSenderId) {
    messageAttributes["AWS.SNS.SMS.SenderID"] = {
      DataType: "String",
      StringValue: config.awsSnsSenderId,
    };
  }

  try {
    const res = await getSnsClient().send(
      new PublishCommand({
        PhoneNumber: e164Phone,
        Message: message,
        MessageAttributes: messageAttributes,
      }),
    );
    logger.info("Phone OTP SMS sent", { messageId: res.MessageId });
  } catch (err) {
    logger.error("Failed to send phone OTP SMS via SNS", {
      err,
      ...(config.env !== "production" ? { phone: e164Phone } : {}),
    });
    throw new SmsDeliveryError("Could not send verification code", err);
  }
}
