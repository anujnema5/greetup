"use client";

import { useState } from "react";
import { Separator } from "@/components/ui/separator";

import PhoneLoginForm from "@/features/auth/components/phone-login-form";
import SocialLoginButtons from "@/features/auth/components/social-login-buttons";
import LoginToggleButtons from "@/features/auth/components/login-toggle-buttons";
import OTPVerification from "@/features/auth/components/otp-verification-form";
import EmailLoginForm from "@/features/auth/components/email-login-form";
import AuthPageLayout from "@/features/auth/components/auth-page-layout";
import { useRouter } from 'next/navigation'

type View = "phone" | "email" | "otp";

export default function LoginPage() {
  const [view, setView] = useState<View>("email");
  const [phoneNumber, setPhoneNumber] = useState("");
  const router = useRouter();

  const handleOTPSent = (phone: string) => {
    setPhoneNumber(phone);
    setView("otp");
  };

  const handleOTPVerified = () => {
    console.log("Login successful!");
  };

  const handleEditPhone = () => {
    setPhoneNumber("");
    setView("phone");
  };

  const handleCreateAccount = () => {
    console.log("Navigate to signup");
    router.push('/register')
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
    <AuthPageLayout
      title="Welcome back"
      subtitle="Log in to continue to your vibe space"
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

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      {renderForm()}
    </AuthPageLayout>
  );
}