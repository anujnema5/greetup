import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { useFirebasePhoneAuth } from "@/features/auth/context/firebase-phone-auth-context";
import {
  phoneOtpVerificationSchema,
  type PhoneOtpVerificationInput,
} from "@/features/auth/schemas/auth.schemas";

export function useOTPVerification(
  phoneE164: string,
  options?: { displayName?: string }
) {
  const { confirmOtp, sendOtp, isSending } = useFirebasePhoneAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PhoneOtpVerificationInput>({
    resolver: zodResolver(phoneOtpVerificationSchema),
    defaultValues: { otp: "" },
  });

  const verifyOTP = useCallback(
    async (otp: string) => {
      setIsLoading(true);
      try {
        await confirmOtp(otp, {
          displayName: options?.displayName,
        });
        return { success: true as const };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Verification failed";
        toast.error(msg);
        return { success: false as const };
      } finally {
        setIsLoading(false);
      }
    },
    [confirmOtp, options?.displayName]
  );

  const resendOTP = useCallback(async () => {
    if (!phoneE164) {
      toast.error("Phone number missing");
      return { success: false as const };
    }
    setIsLoading(true);
    try {
      await sendOtp(phoneE164);
      toast.success("Code sent");
      return { success: true as const };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not resend code";
      toast.error(msg);
      return { success: false as const };
    } finally {
      setIsLoading(false);
    }
  }, [phoneE164, sendOtp]);

  return {
    form,
    verifyOTP,
    resendOTP,
    isLoading: isLoading || isSending,
  };
}
