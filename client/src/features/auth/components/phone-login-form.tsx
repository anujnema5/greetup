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
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full flex items-center justify-center" disabled={isSending}>
          {isSending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            "Send OTP"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default PhoneLoginForm;
