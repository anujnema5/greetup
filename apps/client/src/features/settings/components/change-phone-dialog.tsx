"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";
import { isValidPhoneNumber } from "react-phone-number-input";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
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
import { useUpdateAccountPhone } from "@/features/settings/api/account-settings.mutations";
import { getApiErrorMessage } from "@/lib/api/fetch-client";
import {
  phoneLoginSchema,
  phoneOtpVerificationSchema,
  updateAccountPhoneBodySchema,
  type PhoneLoginInput,
  type PhoneOtpVerificationInput,
} from "@/features/settings/schemas/change-phone.schemas";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "phone" | "otp";

type ChangePhoneDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPhone: string | null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ChangePhoneDialog({ open, onOpenChange, currentPhone }: ChangePhoneDialogProps) {
  const router = useRouter();
  const { sendOtp, confirmPhoneOtpToIdToken, isSending, reset: resetFirebasePhone } =
    useFirebasePhoneAuth();
  const { mutateAsync: updateAccountPhone, isPending: isSaving } = useUpdateAccountPhone();

  const [step, setStep] = useState<Step>("phone");
  const [pendingE164, setPendingE164] = useState("");
  const [countdown, setCountdown] = useState(0);

  const phoneForm = useForm<PhoneLoginInput>({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: { phone: currentPhone ?? "" },
  });

  const otpForm = useForm<PhoneOtpVerificationInput>({
    resolver: zodResolver(phoneOtpVerificationSchema),
    defaultValues: { otp: "" },
  });

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    if (countdown === 0) return;
    const id = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const closeAndReset = () => {
    resetFirebasePhone();
    phoneForm.reset({ phone: currentPhone ?? "" });
    otpForm.reset({ otp: "" });
    setStep("phone");
    setPendingE164("");
    setCountdown(0);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) closeAndReset();
    onOpenChange(next);
  };

  const onSendCode = async (data: PhoneLoginInput) => {
    const raw = data.phone.trim();

    if (!isValidPhoneNumber(raw)) {
      phoneForm.setError("phone", { message: "Enter a valid phone number with country code" });
      return;
    }

    if (currentPhone && raw === currentPhone) {
      phoneForm.setError("phone", {
        message: "This number is already linked to your account — enter a different one",
      });
      return;
    }

    try {
      await sendOtp(raw);
      setPendingE164(raw);
      setStep("otp");
      setCountdown(30);
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
      await updateAccountPhone(parsed.data);
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
      toast.error(getApiErrorMessage(err, "Could not update phone number"));
    }
  };

  const handleResend = () => {
    void sendOtp(pendingE164)
      .then(() => {
        toast.success("Code sent");
        setCountdown(30);
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Could not resend code"),
      );
  };

  const busy = isSending || isSaving;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-100" showCloseButton>

        {/* Step pills — sits top-left, clear of the absolute close button */}
        <div className="flex items-center gap-1.5 pr-8">
          <div className="h-1 w-8 rounded-full bg-primary" />
          <div
            className={cn(
              "h-1 w-8 rounded-full transition-colors duration-300",
              step === "otp" ? "bg-primary" : "bg-muted",
            )}
          />
          <span className="ml-1 text-[11px] text-muted-foreground">
            Step {step === "phone" ? "1" : "2"} of 2
          </span>
        </div>

        {/* Header — icon + title + description */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground">
            {step === "phone" ? (
              <Phone className="h-4 w-4" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <DialogTitle className="text-[13px] font-semibold leading-none text-foreground">
              {step === "phone" ? "Enter new number" : "Check your messages"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-[12px] leading-snug">
              {step === "phone" ? (
                "We'll send a 6-digit code to verify ownership."
              ) : (
                <>
                  Code sent to{" "}
                  <span className="font-medium tabular-nums text-foreground">{pendingE164}</span>
                </>
              )}
            </DialogDescription>
          </div>
        </div>

        {/* ── Step 1: phone input ─────────────────────────────────────────── */}
        {step === "phone" && (
          <Form {...phoneForm}>
            <form onSubmit={phoneForm.handleSubmit(onSendCode)} className="space-y-4">
              <FormField
                control={phoneForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <PhoneInput
                        {...field}
                        placeholder="Enter phone number"
                        defaultCountry="IN"
                        international
                        onChange={(value) => {
                          field.onChange(value);
                          // Clear the error as soon as they start editing again
                          phoneForm.clearErrors("phone");
                        }}
                        onBlur={() => {
                          field.onBlur();
                          const raw = (field.value ?? "").trim();
                          if (currentPhone && raw === currentPhone) {
                            phoneForm.setError("phone", {
                              message:
                                "This number is already linked to your account — enter a different one",
                            });
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-3"
                  disabled={busy}
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-2" disabled={busy}>
                  {busy ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                      Sending…
                    </span>
                  ) : (
                    "Send code"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* ── Step 2: OTP verification ────────────────────────────────────── */}
        {step === "otp" && (
          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(onConfirmOtp)} className="space-y-4">
              <FormField
                control={otpForm.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <InputOTP
                        maxLength={6}
                        value={field.value}
                        onChange={field.onChange}
                        containerClassName="justify-center"
                      >
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
                    <FormMessage className="text-center" />
                  </FormItem>
                )}
              />

              <p className="text-center text-[12px] text-muted-foreground">
                {countdown > 0 ? (
                  <>
                    Resend in{" "}
                    <span className="font-medium tabular-nums text-foreground">{countdown}s</span>
                  </>
                ) : (
                  <>
                    Didn&apos;t receive it?{" "}
                    <button
                      type="button"
                      className="font-medium text-tertiary-foreground hover:underline disabled:opacity-50"
                      disabled={busy}
                      onClick={handleResend}
                    >
                      Resend
                    </button>
                  </>
                )}
              </p>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-3"
                  disabled={busy}
                  onClick={() => {
                    setStep("phone");
                    otpForm.reset({ otp: "" });
                  }}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-2" disabled={busy}>
                  {busy ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                      Saving…
                    </span>
                  ) : (
                    "Verify & save"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}

      </DialogContent>
    </Dialog>
  );
}
