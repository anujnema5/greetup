"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { usePhoneOtp } from "@/features/auth/context/phone-otp-context";

const phoneRegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(8, "Enter a valid phone number"),
});

type PhoneFormValues = z.infer<typeof phoneRegisterSchema>;

// Phone OTP temporarily disabled — SMS costs money and validation isn't ready yet.
const OTP_DISABLED = true;

interface PhoneRegisterFormProps {
  onOTPSent: (phoneE164: string, name: string) => void;
  defaultName?: string;
}

export default function PhoneRegisterForm({ onOTPSent, defaultName }: PhoneRegisterFormProps) {
  const { sendOtp, isSending } = usePhoneOtp();

  const form = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneRegisterSchema),
    defaultValues: {
      name: defaultName?.trim() ?? "",
      phone: "",
    },
  });

  useEffect(() => {
    if (!defaultName?.trim()) {
      return;
    }
    const current = form.getValues("name").trim();
    if (!current) {
      form.setValue("name", defaultName.trim());
    }
  }, [defaultName, form]);

  const onSubmit = async (data: PhoneFormValues) => {
    const raw = data.phone.trim();
    if (!isValidPhoneNumber(raw)) {
      form.setError("phone", { message: "Enter a valid phone number with country code" });
      return;
    }
    try {
      await sendOtp(raw);
      onOTPSent(raw, data.name.trim());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send verification code";
      toast.error(msg);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Your name"
                  className="placeholder:text-sm"
                  {...field}
                  disabled={isSending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  disabled={isSending}
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
            "Continue"
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
}
