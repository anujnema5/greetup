"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { PageLoading } from "@/components/page-loading";
import PhoneLoginForm from "@/features/auth/components/phone-login-form";
import SocialLoginButtons from "@/features/auth/components/social-login-buttons";
// import LoginToggleButtons from "@/features/auth/components/login-toggle-buttons";
import OTPVerification from "@/features/auth/components/otp-verification-form";
// import EmailLoginForm from "@/features/auth/components/email-login-form";
import AuthPageLayout from "@/features/auth/components/auth-page-layout";
import { AuthFormDivider } from "@/features/auth/components/auth-form-divider";
import { AuthGuestContinueButton } from "@/features/auth/components/auth-guest-continue-button";
import { PhoneOtpProvider } from "@/features/auth/context/phone-otp-context";
import { getAuthCallbackUrl } from "@/features/auth/lib/auth-callback-url";

// Email auth UI temporarily hidden — keep "email" for future re-enable.
type View = "phone" | "email" | "otp";

function oauthErrorMessage(code: string): string {
  switch (code) {
    case "state_mismatch":
    case "state_not_found":
    case "please_restart_the_process":
      return "Google sign-in was interrupted. Please try again.";
    case "access_denied":
      return "Google sign-in was cancelled.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

function LoginPageContent() {
  const [view, setView] = useState<View>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromGuestIntent = searchParams.get("from") === "guest";
  const oauthError = searchParams.get("error");
  const oauthErrorShownRef = useRef(false);

  useEffect(() => {
    if (!oauthError || oauthErrorShownRef.current) return;
    oauthErrorShownRef.current = true;
    toast.error(oauthErrorMessage(oauthError));
    const next = new URLSearchParams(searchParams.toString());
    next.delete("error");
    const qs = next.toString();
    router.replace(qs ? `/login?${qs}` : "/login");
  }, [oauthError, router, searchParams]);

  const handleOTPSent = (phone: string) => {
    setPhoneNumber(phone);
    setView("otp");
  };

  const handleOTPVerified = () => {
    router.push(getAuthCallbackUrl());
  };

  const handleEditPhone = () => {
    setPhoneNumber("");
    setView("phone");
  };

  const handleCreateAccount = () => {
    router.push(fromGuestIntent ? "/register?from=guest" : "/register");
  };

  const renderForm = () => {
    switch (view) {
      case "otp":
        return (
          <OTPVerification
            phoneNumber={phoneNumber}
            onVerified={handleOTPVerified}
            onEditPhone={handleEditPhone}
          />
        );

      // case "email":
      //   return <EmailLoginForm />;

      default:
        return <PhoneLoginForm onOTPSent={handleOTPSent} />;
    }
  };

  return (
    <PhoneOtpProvider>
      <AuthPageLayout
        title="Welcome back"
        subtitle="Log in to continue"
        footerText="New to Greetup?"
        footerLinkText="Create account"
        onFooterLinkClick={handleCreateAccount}
        backHref="/"
        backLabel="Back to home"
      >
        <SocialLoginButtons callbackURL={getAuthCallbackUrl()} />

        {/* Email / phone toggle — re-enable with email auth
        {view !== "otp" && (
          <LoginToggleButtons
            currentView={view === "email" ? "email" : "phone"}
            onToggle={() => setView(view === "email" ? "phone" : "email")}
          />
        )}
        */}

        <AuthFormDivider label="Or continue with" />

        {renderForm()}

        {view !== "otp" ? <AuthGuestContinueButton /> : null}
      </AuthPageLayout>
    </PhoneOtpProvider>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <LoginPageContent />
    </Suspense>
  );
}
