"use client";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PhoneInput } from "@/components/ui/phone-input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isValidPhoneNumber } from "react-phone-number-input";

import { usePhoneOtp } from "@/features/auth/context/phone-otp-context";
import { phoneLoginSchema, type PhoneLoginInput } from "../schemas/auth.schemas";

interface PhoneLoginFormProps {
  onOTPSent: (phoneE164: string) => void;
}

// Phone OTP temporarily disabled — SMS costs money and validation isn't ready yet.
const OTP_DISABLED = true;

const PhoneLoginForm = ({ onOTPSent }: PhoneLoginFormProps) => {
  const { sendOtp, isSending } = usePhoneOtp();

  const form = useForm<PhoneLoginInput>({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: { phone: "" },
  });

  const onSubmit = async (data: PhoneLoginInput) => {
    const raw = data.phone.trim();
    if (!isValidPhoneNumber(raw)) {
      form.setError("phone", { message: "Enter a valid phone number with country code" });
      return;
    }
    try {
      await sendOtp(raw);
      onOTPSent(raw);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send verification code";
      toast.error(msg);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone number</FormLabel>
              <FormControl>
                <PhoneInput
                  {...field}
                  placeholder="Enter phone number"
                  defaultCountry="US"
                  international
                  className="[&_input]:placeholder:text-sm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSending || OTP_DISABLED}>
          {isSending ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              Sending...
            </span>
          ) : (
            "Send OTP"
          )}
        </Button>

        {OTP_DISABLED && (
          <p className="text-center text-xs text-muted-foreground">
            OTP credits ran out and I’m broke 😅 Use Google Sign-In.
          </p>
        )}
      </form>
    </Form>
  );
};

export default PhoneLoginForm;
