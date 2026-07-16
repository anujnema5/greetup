/**
 * Settings → change phone. Reuses auth field rules; keeps zod next to the settings feature.
 * Verification is done server-side (AWS SNS OTP) via the `phone-otp` plugin, so the client
 * only needs the phone + OTP field schemas.
 */
export {
  phoneLoginSchema,
  phoneOtpVerificationSchema,
  type PhoneLoginInput,
  type PhoneOtpVerificationInput,
} from "@/features/auth/schemas/auth.schemas";
