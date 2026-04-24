"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { PhoneInput } from "@/components/ui/phone-input";
import { useFirebasePhoneAuth } from "@/features/auth/context/firebase-phone-auth-context";
import { getFirebaseAuth } from "@/lib/firebase/client-app";
import { useUpdateAccountPhoneMutation } from "@/features/settings/api/account-settings-api";
import {
  phoneLoginSchema,
  phoneOtpVerificationSchema,
  updateAccountPhoneBodySchema,
  type PhoneLoginInput,
  type PhoneOtpVerificationInput,
} from "@/features/settings/schemas/change-phone.schemas";
import { getRtkQueryErrorMessage } from "@/lib/api/rtk-query-error";
import { isValidPhoneNumber } from "react-phone-number-input";

type Step = "phone" | "otp";

type ChangePhoneDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPhone: string | null;
};

export function ChangePhoneDialog({ open, onOpenChange, currentPhone }: ChangePhoneDialogProps) {
  const router = useRouter();
  const { sendOtp, confirmPhoneOtpToIdToken, isSending, reset: resetFirebasePhone } =
    useFirebasePhoneAuth();
  const [updateAccountPhone, { isLoading: isSaving }] = useUpdateAccountPhoneMutation();

  const [step, setStep] = useState<Step>("phone");
  const [pendingE164, setPendingE164] = useState("");

  const phoneForm = useForm<PhoneLoginInput>({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: { phone: currentPhone ?? "" },
  });

  const otpForm = useForm<PhoneOtpVerificationInput>({
    resolver: zodResolver(phoneOtpVerificationSchema),
    defaultValues: { otp: "" },
  });

  const closeAndReset = () => {
    resetFirebasePhone();
    phoneForm.reset({ phone: currentPhone ?? "" });
    otpForm.reset({ otp: "" });
    setStep("phone");
    setPendingE164("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      closeAndReset();
    }
    onOpenChange(next);
  };

  const onSendCode = async (data: PhoneLoginInput) => {
    const raw = data.phone.trim();
    if (!isValidPhoneNumber(raw)) {
      phoneForm.setError("phone", {
        message: "Enter a valid phone number with country code",
      });
      return;
    }
    if (currentPhone && raw === currentPhone) {
      toast.message("This is already your phone number.");
      return;
    }
    try {
      await sendOtp(raw);
      setPendingE164(raw);
      setStep("otp");
      otpForm.reset({ otp: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send code");
    }
  };

  const onConfirmOtp = async (data: PhoneOtpVerificationInput) => {
    try {
      const idToken = await confirmPhoneOtpToIdToken(data.otp);
      const parsed = updateAccountPhoneBodySchema.safeParse({ idToken });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Invalid token");
        return;
      }
      await updateAccountPhone(parsed.data).unwrap();
      toast.success("Phone number updated");
      try {
        await getFirebaseAuth().signOut();
      } catch {
        /* ignore */
      }
      resetFirebasePhone();
      handleOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
    }
  };

  const busy = isSending || isSaving;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Change phone number</DialogTitle>
          <DialogDescription>
            We&apos;ll text a code to the new number. Your account stays signed in.
          </DialogDescription>
        </DialogHeader>

        {step === "phone" ? (
          <Form {...phoneForm}>
            <form onSubmit={phoneForm.handleSubmit(onSendCode)} className="space-y-4">
              <FormField
                control={phoneForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New phone number</FormLabel>
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
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send code"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(onConfirmOtp)} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Code sent to{" "}
                <span className="font-medium text-foreground">{pendingE164}</span>
              </p>
              <FormField
                control={otpForm.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Verification code</FormLabel>
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
              <p className="text-center text-sm text-muted-foreground">
                Didn&apos;t receive it?{" "}
                <button
                  type="button"
                  className="underline"
                  disabled={busy}
                  onClick={() =>
                    void sendOtp(pendingE164)
                      .then(() => toast.success("Code sent"))
                      .catch((err) =>
                        toast.error(err instanceof Error ? err.message : "Could not resend code")
                      )
                  }
                >
                  Resend
                </button>
              </p>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setStep("phone");
                    otpForm.reset({ otp: "" });
                  }}
                >
                  Back
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Verify & save"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
