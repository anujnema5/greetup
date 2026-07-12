"use client";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PhoneInput } from "@/components/ui/phone-input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isValidPhoneNumber } from "react-phone-number-input";

import { useFirebasePhoneAuth } from "@/features/auth/context/firebase-phone-auth-context";
import { phoneLoginSchema, type PhoneLoginInput } from "../schemas/auth.schemas";

interface PhoneLoginFormProps {
  onOTPSent: (phoneE164: string) => void;
}

const PhoneLoginForm = ({ onOTPSent }: PhoneLoginFormProps) => {
  const { sendOtp, isSending } = useFirebasePhoneAuth();

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
                  defaultCountry="IN"
                  international
                  className="[&_input]:placeholder:text-sm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSending}>
          {isSending ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              Sending...
            </span>
          ) : (
            "Send OTP"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default PhoneLoginForm;
