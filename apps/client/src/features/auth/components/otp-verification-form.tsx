"use client";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useOTPVerification } from "../hooks/use-otp-verification";
import type { PhoneOtpVerificationInput } from "../schemas/auth.schemas";

interface OTPVerificationProps {
  phoneNumber: string;
  onVerified: () => void;
  onEditPhone: () => void;
  /** When set, sent to the server on successful OTP (registration flow). */
  displayName?: string;
}

/** Inline link-style action, matching the Resend link in the Settings change-phone dialog. */
const LINK_BUTTON_CLASS =
  "cursor-pointer rounded-sm font-medium text-tertiary-foreground underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline";

function OTPVerification({
  phoneNumber,
  onVerified,
  onEditPhone,
  displayName,
}: OTPVerificationProps) {
  const { form, verifyOTP, resendOTP, isLoading } = useOTPVerification(phoneNumber, {
    displayName,
  });

  const onSubmit = async (data: PhoneOtpVerificationInput) => {
    const result = await verifyOTP(data.otp);
    if (result.success) {
      onVerified();
    }
  };

  return (
    <div className="w-full">
      <p className="text-center text-[13px] font-semibold leading-none tracking-tight text-foreground mb-1.5">
        Verify OTP
      </p>
      <p className="text-center text-[12px] leading-snug text-muted-foreground mb-6">
        Code sent to <span className="font-medium text-foreground">{phoneNumber}</span>
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem className="flex flex-col items-center">
                <FormControl>
                  <InputOTP maxLength={6} value={field.value} onChange={field.onChange}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                Verifying...
              </span>
            ) : (
              "Verify OTP"
            )}
          </Button>

          <div className="space-y-2.5 text-center">
            <p className="text-[12px] leading-snug text-muted-foreground">
              Didn&apos;t receive the code?{" "}
              <button
                type="button"
                onClick={() => void resendOTP()}
                disabled={isLoading}
                className={LINK_BUTTON_CLASS}
              >
                Resend
              </button>
            </p>

            <p className="text-[12px] leading-snug text-muted-foreground">
              Wrong number?{" "}
              <button
                type="button"
                onClick={onEditPhone}
                disabled={isLoading}
                className={LINK_BUTTON_CLASS}
              >
                Edit phone
              </button>
            </p>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default OTPVerification;
