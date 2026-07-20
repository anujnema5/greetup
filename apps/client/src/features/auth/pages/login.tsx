"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { PageLoading } from "@/components/page-loading";
import SocialLoginButtons from "@/features/auth/components/social-login-buttons";
import AuthPageLayout from "@/features/auth/components/auth-page-layout";
import { AuthGuestContinueButton } from "@/features/auth/components/auth-guest-continue-button";
import {
  DEFAULT_AUTHED_PATH,
  getAuthCallbackUrl,
  NEXT_PARAM,
  POST_AUTH_PATH,
  sanitizeNextPath,
} from "@/features/auth/lib/auth-callback-url";
import { getSessionIsLoggedIn } from "@/features/auth/lib/session-user";
import { useGuestTryStatus } from "@/features/guest-try/hooks/use-guest-try-status";
import { useSession } from "@/lib/auth-client";
import PhoneLoginForm from "@/features/auth/components/phone-login-form";
import { AuthFormDivider } from "@/features/auth/components/auth-form-divider";
import { PhoneOtpProvider } from "@/features/auth/context/phone-otp-context";

// Email auth UI temporarily hidden (Google-only launch) — keep for future re-enable.
// import { useState } from "react";
// import LoginToggleButtons from "@/features/auth/components/login-toggle-buttons";
// import OTPVerification from "@/features/auth/components/otp-verification-form";
// import EmailLoginForm from "@/features/auth/components/email-login-form";

// type View = "phone" | "email" | "otp";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromGuestIntent = searchParams.get("from") === "guest";
  const oauthError = searchParams.get("error");
  const oauthErrorShownRef = useRef(false);

  const nextPath = sanitizeNextPath(searchParams.get(NEXT_PARAM));
  // After Google returns, land the user where they were headed (else profile-setup,
  // which bounces onboarded users on to /home).
  const callbackURL = getAuthCallbackUrl(nextPath ?? POST_AUTH_PATH);

  const { data: session, isPending: sessionPending } = useSession();
  const alreadyLoggedIn = getSessionIsLoggedIn(session);
  const { data: guestStatus, isPending: guestPending } = useGuestTryStatus({
    enabled: !sessionPending && alreadyLoggedIn,
  });
  // Guests have a session but must stay on /login to convert to a full account.
  // Require an active session — never treat cached guest status as live when logged out.
  const isGuest = alreadyLoggedIn && guestStatus?.isGuest === true;
  const isConfirmedMember =
    alreadyLoggedIn && !guestPending && guestStatus?.isGuest === false;

  useEffect(() => {
    if (sessionPending || guestPending || !isConfirmedMember) return;
    router.replace(nextPath ?? DEFAULT_AUTHED_PATH);
  }, [sessionPending, guestPending, isConfirmedMember, nextPath, router]);

  useEffect(() => {
    if (!oauthError || oauthErrorShownRef.current) return;
    oauthErrorShownRef.current = true;
    toast.error(oauthErrorMessage(oauthError));
    const next = new URLSearchParams(searchParams.toString());
    next.delete("error");
    const qs = next.toString();
    router.replace(qs ? `/login?${qs}` : "/login");
  }, [oauthError, router, searchParams]);

  const handleCreateAccount = () => {
    const params = new URLSearchParams();
    if (fromGuestIntent) params.set("from", "guest");
    if (nextPath) params.set(NEXT_PARAM, nextPath);
    const qs = params.toString();
    router.push(qs ? `/register?${qs}` : "/register");
  };

  /* Phone OTP flow — re-enable with SMS provider
  const [view, setView] = useState<View>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");

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
  */

  // Confirmed full accounts are redirected away — show the branded loader
  // instead of flashing the login form. Guests (and logged-out users) see the form.
  // Don't block on guestPending: after logout the session can linger briefly and a
  // pending guest fetch would hide "Try as a guest" behind a full-page loader.
  if (sessionPending || isConfirmedMember) {
    return <PageLoading />;
  }

  return (
    <PhoneOtpProvider>
      <AuthPageLayout
        title="Welcome back"
        subtitle="Log in to continue"
        footerText="New to Greetup?"
        footerLinkText="Create account"
        onFooterLinkClick={handleCreateAccount}
        backHref={fromGuestIntent || isGuest ? "/try" : "/"}
        backLabel={fromGuestIntent || isGuest ? "Back to try" : "Back to home"}
      >
        <SocialLoginButtons callbackURL={callbackURL} />

        <AuthFormDivider label="Or continue with" />
        <PhoneLoginForm onOTPSent={() => {}} />

        <AuthGuestContinueButton />
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
