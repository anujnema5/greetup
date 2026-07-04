"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import SocialLoginButtons from "@/features/auth/components/social-login-buttons";
import RegisterToggleButtons from "@/features/auth/components/register-toggle-buttons";
import OTPVerification from "@/features/auth/components/otp-verification-form";
import EmailRegisterForm from "@/features/auth/components/email-register-form";
import AuthPageLayout from "@/features/auth/components/auth-page-layout";
import { AuthFormDivider } from "@/features/auth/components/auth-form-divider";
import { AuthGuestContinueButton } from "@/features/auth/components/auth-guest-continue-button";
import PhoneRegisterForm from "@/features/auth/components/phone-register-form";
import { GuestRegisterMergeBanner } from "@/features/auth/components/guest-register-merge-banner";
import {
  getGuestRegisterAuthCallbackUrl,
  getGuestRegisterPostSignupPath,
} from "@/features/auth/lib/guest-register-post-signup-path";
import { FirebasePhoneAuthProvider } from "@/features/auth/context/firebase-phone-auth-context";
import { useSignupMergeContext } from "@/features/guest-try/hooks/use-signup-merge-context";
import { useGuestTryStatus } from "@/features/guest-try/hooks/use-guest-try-status";
import { GUEST_TRIAL_REGISTER } from "@/lib/copy/user-messages";

type View = "phone" | "email" | "otp";

function RegisterPageContent() {
  const [view, setView] = useState<View>("email");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [registrationName, setRegistrationName] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromGuestIntent = searchParams.get("from") === "guest";

  const {
    data: signupContext,
    isLoading: signupContextLoading,
  } = useSignupMergeContext({ fromGuest: fromGuestIntent });

  const { data: guestStatus } = useGuestTryStatus({
    enabled: signupContext?.mergeAvailable === true,
  });

  const suggestedName = guestStatus?.displayName?.trim() || "";
  const postSignupPath = getGuestRegisterPostSignupPath(signupContext);
  const authCallbackURL = getGuestRegisterAuthCallbackUrl(signupContext);

  const handleOTPSent = (phone: string, name: string) => {
    setPhoneNumber(phone);
    setRegistrationName(name);
    setView("otp");
  };

  const handleOTPVerified = () => {
    router.push(postSignupPath);
  };

  const handleEditPhone = () => {
    setPhoneNumber("");
    setRegistrationName("");
    setView("phone");
  };

  const handleLogin = () => {
    router.push(fromGuestIntent ? "/login?from=guest" : "/login");
  };

  const title = fromGuestIntent ? GUEST_TRIAL_REGISTER.title : "Create your account";
  const subtitle = fromGuestIntent ? GUEST_TRIAL_REGISTER.subtitle : undefined;

  const renderForm = () => {
    switch (view) {
      case "otp":
        return (
          <OTPVerification
            phoneNumber={phoneNumber}
            displayName={registrationName}
            onVerified={handleOTPVerified}
            onEditPhone={handleEditPhone}
          />
        );

      case "email":
        return (
          <EmailRegisterForm
            defaultName={suggestedName}
            emailVerificationCallbackURL={authCallbackURL}
            verifyEmailFrom={fromGuestIntent ? "guest-register" : "register"}
          />
        );

      default:
        return (
          <PhoneRegisterForm onOTPSent={handleOTPSent} defaultName={suggestedName} />
        );
    }
  };

  return (
    <FirebasePhoneAuthProvider>
      <AuthPageLayout
        title={title}
        subtitle={subtitle}
        footerText="Already have an account?"
        footerLinkText="Log in"
        onFooterLinkClick={handleLogin}
      >
        <GuestRegisterMergeBanner
          fromGuestIntent={fromGuestIntent}
          signupContext={signupContext}
          isLoading={signupContextLoading}
        />

        <SocialLoginButtons callbackURL={authCallbackURL} />

        {view !== "otp" && (
          <RegisterToggleButtons
            currentView={view}
            onToggle={() => setView(view === "email" ? "phone" : "email")}
          />
        )}

        <AuthFormDivider label="Or continue with" />

        {renderForm()}

        {view !== "otp" ? <AuthGuestContinueButton /> : null}
      </AuthPageLayout>
    </FirebasePhoneAuthProvider>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
