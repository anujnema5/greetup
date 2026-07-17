"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageLoading } from "@/components/page-loading";
import SocialLoginButtons from "@/features/auth/components/social-login-buttons";
import AuthPageLayout from "@/features/auth/components/auth-page-layout";
// import { AuthGuestContinueButton } from "@/features/auth/components/auth-guest-continue-button"; // guest continue temporarily hidden
import { GuestRegisterMergeBanner } from "@/features/auth/components/guest-register-merge-banner";
import { getGuestRegisterAuthCallbackUrl } from "@/features/auth/lib/guest-register-post-signup-path";
import { useSignupMergeContext } from "@/features/guest-try/hooks/use-signup-merge-context";
import { GUEST_TRIAL_REGISTER, REGISTER_PAGE } from "@/lib/copy/user-messages";

import PhoneRegisterForm from "@/features/auth/components/phone-register-form";
import { AuthFormDivider } from "@/features/auth/components/auth-form-divider";
import { PhoneOtpProvider } from "@/features/auth/context/phone-otp-context";

// Email auth UI temporarily hidden (Google-only launch) — keep for future re-enable.
// import { useState } from "react";
// import RegisterToggleButtons from "@/features/auth/components/register-toggle-buttons";
// import OTPVerification from "@/features/auth/components/otp-verification-form";
// import EmailRegisterForm from "@/features/auth/components/email-register-form";
// import { useGuestTryStatus } from "@/features/guest-try/hooks/use-guest-try-status";
// import { getGuestRegisterPostSignupPath } from "@/features/auth/lib/guest-register-post-signup-path";

// type View = "phone" | "email" | "otp";

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromGuestIntent = searchParams.get("from") === "guest";

  const {
    data: signupContext,
    isLoading: signupContextLoading,
  } = useSignupMergeContext({ fromGuest: fromGuestIntent });

  const authCallbackURL = getGuestRegisterAuthCallbackUrl(signupContext);

  const handleLogin = () => {
    router.push(fromGuestIntent ? "/login?from=guest" : "/login");
  };

  const title = fromGuestIntent ? GUEST_TRIAL_REGISTER.title : REGISTER_PAGE.title;
  const subtitle = fromGuestIntent ? GUEST_TRIAL_REGISTER.subtitle : REGISTER_PAGE.subtitle;

  /* Phone OTP flow — re-enable with SMS provider
  const [view, setView] = useState<View>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [registrationName, setRegistrationName] = useState("");

  const { data: guestStatus } = useGuestTryStatus({
    enabled: signupContext?.mergeAvailable === true,
  });

  const suggestedName = guestStatus?.displayName?.trim() || "";
  const postSignupPath = getGuestRegisterPostSignupPath(signupContext);

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

      // case "email":
      //   return (
      //     <EmailRegisterForm
      //       defaultName={suggestedName}
      //       emailVerificationCallbackURL={authCallbackURL}
      //       verifyEmailFrom={fromGuestIntent ? "guest-register" : "register"}
      //     />
      //   );

      default:
        return (
          <PhoneRegisterForm onOTPSent={handleOTPSent} defaultName={suggestedName} />
        );
    }
  };
  */

  return (
    <PhoneOtpProvider>
      <AuthPageLayout
        title={title}
        subtitle={subtitle}
        footerText="Already have an account?"
        footerLinkText="Log in"
        onFooterLinkClick={handleLogin}
        backHref="/"
        backLabel="Back to home"
      >
        <GuestRegisterMergeBanner
          fromGuestIntent={fromGuestIntent}
          signupContext={signupContext}
          isLoading={signupContextLoading}
        />

        <SocialLoginButtons callbackURL={authCallbackURL} />

        <AuthFormDivider label="Or continue with" />
        <PhoneRegisterForm onOTPSent={() => {}} />

        {/* Guest "try as guest" continue temporarily hidden — keep for future re-enable.
        <AuthGuestContinueButton />
        */}
      </AuthPageLayout>
    </PhoneOtpProvider>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RegisterPageContent />
    </Suspense>
  );
}
