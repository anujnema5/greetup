// app/(auth)/register/page.tsx
"use client";

import { useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";

import SocialLoginButtons from "@/features/auth/components/social-login-buttons";
import RegisterToggleButtons from "@/features/auth/components/register-toggle-buttons";
import OTPVerification from "@/features/auth/components/otp-verification-form";
import EmailRegisterForm from "@/features/auth/components/email-register-form";
import AuthPageLayout from "@/features/auth/components/auth-page-layout";
import PhoneRegisterForm from "../components/phone-register-form";
import { useRouter } from 'next/navigation'
import { authClient } from "@/lib/auth-client";

type View = "phone" | "email" | "otp";

export default function RegisterPage() {
    const [view, setView] = useState<View>("email");
    const [phoneNumber, setPhoneNumber] = useState("");
    const router = useRouter()

    const handleOTPSent = (phone: string) => {
        setPhoneNumber(phone);
        setView("otp");
    };

    const handleOTPVerified = () => {
        console.log("Registration successful!");
        // Redirect to onboarding or dashboard
    };

    const handleEditPhone = () => {
        setPhoneNumber("");
        setView("phone");
    };

    const handleLogin = () => {
        console.log("Navigate to login");
        router.push('/login')
    };

    (async () => {
        const session = await authClient.getSession();
        if (session?.data?.user) {
            console.log("User verified:", session?.data?.user.email);
        }
    })();

    const renderForm = () => {
        switch (view) {
            case "otp":
                return (
                    <OTPVerification
                        phoneNumber={phoneNumber}
                        onVerified={handleOTPVerified}
                        onEditPhone={handleEditPhone}
                        isRegistration
                    />
                );

            case "email":
                return <EmailRegisterForm />;

            default:
                return <PhoneRegisterForm onOTPSent={handleOTPSent} />;
        }
    };

    return (
        <AuthPageLayout
            title="Create your account"
            subtitle="Join Circlo and start connecting"
            footerText="Already have an account?"
            footerLinkText="Log in"
            onFooterLinkClick={handleLogin}
        >
            <SocialLoginButtons isRegistration />

            {/* {view !== "otp" && (
                <RegisterToggleButtons
                    currentView={view}
                    onToggle={() => setView(view === "email" ? "phone" : "email")}
                />
            )} */}

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