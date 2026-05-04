// features/auth/components/auth-page-layout.tsx
import { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";

interface AuthPageLayoutProps {
    children: ReactNode;
    title: string;
    subtitle: string;
    footerText: string;
    footerLinkText: string;
    onFooterLinkClick: () => void;
}

export default function AuthPageLayout({
    children,
    title,
    subtitle,
    footerText,
    footerLinkText,
    onFooterLinkClick,
}: AuthPageLayoutProps) {
    return (
        <div className="min-h-screen flex w-full items-center justify-center bg-linear-to-br from-background via-background to-muted/20 relative">
            <div className="w-full max-w-7xl h-full grid lg:grid-cols-2 p-6 lg:p-8 gap-8 lg:gap-12">
                {/* Left Panel - Auth Form */}
                <div className="flex items-center justify-center ">
                    <div className="w-full max-w-md space-y-8">
                        {/* Logo Section */}
                        <div className="flex flex-col items-center space-y-6">
                            <Logo className="scale-110" />

                            <div className="text-center space-y-2">
                                <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                                <p className="text-base text-muted-foreground">{subtitle}</p>
                            </div>
                        </div>

                        {/* Auth Forms */}
                        <div className="space-y-6 ">
                            {children}

                            {/* Footer Link Section */}
                            <div className="pt-4">
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <Separator />
                                    </div>
                                </div>

                                <div className="pt-6 text-center">
                                    <p className="text-sm text-muted-foreground">
                                        {footerText}{" "}
                                        <button
                                            onClick={onFooterLinkClick}
                                            className="font-semibold text-primary cursor-pointer hover:underline underline-offset-4 transition-all hover:text-primary/80"
                                        >
                                            {footerLinkText}
                                        </button>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Feature Showcase */}
                <div className="hidden lg:flex items-center justify-center">
                    <div className="relative w-full h-full min-h-[600px] rounded-2xl border-2 bg-linear-to-br from-primary/10 via-primary/5 to-background backdrop-blur-sm shadow-2xl overflow-hidden">
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

                        {/* Content */}
                        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-12 space-y-8">
                            <div className="space-y-4">
                                <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                                    <span className="text-3xl font-black leading-none tracking-[-0.03em]" aria-hidden>
                                        G
                                    </span>
                                </div>

                                <h2 className="text-4xl font-bold tracking-tight">
                                    Greetup
                                </h2>
                                <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
                                    Connect, talk, and share in real time with your people.
                                    Experience seamless communication like never before.
                                </p>
                            </div>

                            {/* Feature highlights */}
                            <div className="grid grid-cols-3 gap-6 pt-8">
                                <div className="space-y-2">
                                    <div className="text-2xl font-bold text-primary">100K+</div>
                                    <div className="text-xs text-muted-foreground">
                                        Active Users
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-2xl font-bold text-primary">24/7</div>
                                    <div className="text-xs text-muted-foreground">
                                        Available
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-2xl font-bold text-primary">Secure</div>
                                    <div className="text-xs text-muted-foreground">
                                        Encrypted
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Theme Toggle */}
                <div className="absolute right-6 top-6">
                    <ThemeToggle />
                </div>
            </div>
        </div>
    );
}