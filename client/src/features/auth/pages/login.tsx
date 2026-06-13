"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import PhoneLoginForm from "@/features/auth/components/phone-login-form";
import SocialLoginButtons from "@/features/auth/components/social-login-buttons";
import LoginToggleButtons from "@/features/auth/components/login-toggle-buttons";
import OTPVerification from "@/features/auth/components/otp-verification-form";
import EmailLoginForm from "@/features/auth/components/email-login-form";
import AuthPageLayout from "@/features/auth/components/auth-page-layout";
import { AuthFormDivider } from "@/features/auth/components/auth-form-divider";
import { AuthGuestContinueButton } from "@/features/auth/components/auth-guest-continue-button";
import { FirebasePhoneAuthProvider } from "@/features/auth/context/firebase-phone-auth-context";

type View = "phone" | "email" | "otp";

function LoginPageContent() {
  const [view, setView] = useState<View>("email");
  const [phoneNumber, setPhoneNumber] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromGuestIntent = searchParams.get("from") === "guest";

  const handleOTPSent = (phone: string) => {
    setPhoneNumber(phone);
    setView("otp");
  };

  const handleOTPVerified = () => {
    router.push("/");
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

      case "email":
        return <EmailLoginForm />;

      default:
        return <PhoneLoginForm onOTPSent={handleOTPSent} />;
    }
  };

  return (
    <FirebasePhoneAuthProvider>
      <AuthPageLayout
        title="Welcome back"
        subtitle="Log in to continue"
        footerText="New to Greetup?"
        footerLinkText="Create account"
        onFooterLinkClick={handleCreateAccount}
      >
        <SocialLoginButtons />

        {view !== "otp" && (
          <LoginToggleButtons
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
