"use client";

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
import { useFirebasePhoneAuth } from "@/features/auth/context/firebase-phone-auth-context";

const phoneRegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(8, "Enter a valid phone number"),
});

type PhoneFormValues = z.infer<typeof phoneRegisterSchema>;

interface PhoneRegisterFormProps {
  onOTPSent: (phoneE164: string, name: string) => void;
}

export default function PhoneRegisterForm({ onOTPSent }: PhoneRegisterFormProps) {
  const { sendOtp, isSending } = useFirebasePhoneAuth();

  const form = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneRegisterSchema),
    defaultValues: {
      name: "",
      phone: "",
    },
  });

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
                <Input placeholder="Your name" {...field} disabled={isSending} />
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
                  defaultCountry="IN"
                  international
                  disabled={isSending}
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
            "Continue"
          )}
        </Button>
      </form>
    </Form>
  );
}
