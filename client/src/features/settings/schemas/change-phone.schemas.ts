import { z } from "zod";

/**
 * Settings → change phone. Reuses auth field rules; keeps zod next to the settings feature.
 */
export {
  phoneLoginSchema,
  phoneOtpVerificationSchema,
  type PhoneLoginInput,
  type PhoneOtpVerificationInput,
} from "@/features/auth/schemas/auth.schemas";

/** RTK mutation body — verified on the client before dispatch. */
export const updateAccountPhoneBodySchema = z.object({
  idToken: z.string().min(1, "Missing ID token"),
});

export type UpdateAccountPhoneBody = z.infer<typeof updateAccountPhoneBodySchema>;
