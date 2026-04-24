"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";

import SocialLoginButtons from "@/features/auth/components/social-login-buttons";
import RegisterToggleButtons from "@/features/auth/components/register-toggle-buttons";
import OTPVerification from "@/features/auth/components/otp-verification-form";
import EmailRegisterForm from "@/features/auth/components/email-register-form";
import AuthPageLayout from "@/features/auth/components/auth-page-layout";
import PhoneRegisterForm from "@/features/auth/components/phone-register-form";
import { FirebasePhoneAuthProvider } from "@/features/auth/context/firebase-phone-auth-context";

type View = "phone" | "email" | "otp";

export default function RegisterPage() {
  const [view, setView] = useState<View>("email");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [registrationName, setRegistrationName] = useState("");
  const router = useRouter();

  const handleOTPSent = (phone: string, name: string) => {
    setPhoneNumber(phone);
    setRegistrationName(name);
    setView("otp");
  };

  const handleOTPVerified = () => {
    router.push("/");
  };

  const handleEditPhone = () => {
    setPhoneNumber("");
    setRegistrationName("");
    setView("phone");
  };

  const handleLogin = () => {
    router.push("/login");
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

      case "email":
        return <EmailRegisterForm />;

      default:
        return <PhoneRegisterForm onOTPSent={handleOTPSent} />;
    }
  };

  return (
    <FirebasePhoneAuthProvider>
      <AuthPageLayout
        title="Create your account"
        subtitle="Join Greetup and start connecting"
        footerText="Already have an account?"
        footerLinkText="Log in"
        onFooterLinkClick={handleLogin}
      >
        <SocialLoginButtons onPhoneClick={() => setView("phone")} />

        {view !== "otp" && (
          <RegisterToggleButtons
            currentView={view}
            onToggle={() => setView(view === "email" ? "phone" : "email")}
          />
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        {renderForm()}
      </AuthPageLayout>
    </FirebasePhoneAuthProvider>
  );
}
