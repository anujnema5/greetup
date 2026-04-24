"use client";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
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
      <p className="text-center text-xl font-semibold mb-2">Verify OTP</p>
      <p className="text-center text-sm text-muted-foreground mb-6">
        Code sent to <span className="font-medium">{phoneNumber}</span>
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
            {isLoading ? "Verifying..." : "Verify OTP"}
          </Button>

          <p className="text-center text-sm">
            Didn&apos;t receive the code?{" "}
            <button
              className="cursor-pointer underline"
              type="button"
              onClick={() => void resendOTP()}
            >
              Resend
            </button>
          </p>

          <p className="text-center text-xs text-muted-foreground">
            Wrong number?{" "}
            <button type="button" className="cursor-pointer underline" onClick={onEditPhone}>
              Edit phone
            </button>
          </p>
        </form>
      </Form>
    </div>
  );
}

export default OTPVerification;
