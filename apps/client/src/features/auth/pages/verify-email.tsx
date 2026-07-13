// app/verify-email/page.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageLoading } from '@/components/page-loading';
import { getAuthCallbackUrl } from '../lib/auth-callback-url';
import { getAuthErrorMessage } from '../utils/auth-error';

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email');
    const fromRegister = searchParams.get('from') === 'register';
    const fromLogin = searchParams.get('from') === 'login';

    const [resending, setResending] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (fromRegister) {
            setMessage('A verification link has been sent to your email address.');
        } else if (fromLogin) {
            setMessage('Your email is not verified. Please check your inbox for the verification link.');
        }
    }, [fromRegister, fromLogin]);

    const resendEmail = async () => {
        if (!email || resending) return;

        setResending(true);

        try {
            const { error } = await authClient.sendVerificationEmail({
                email,
                callbackURL: getAuthCallbackUrl(),
            });

            if (error) {
                toast.error(getAuthErrorMessage(error));
                return;
            }

            toast.success("Verification email sent. Please check your inbox.");
        } catch (err) {
            toast.error("Unable to send verification email. Please try again.");
        } finally {
            setResending(false);
        }
    };


    useEffect(() => {
        // Check if user is already logged in
        const checkSession = async () => {
            const session = await authClient.getSession();
            console.log(session?.data?.user);

            if (session?.data?.user?.emailVerified) {
                // router.push('/dashboard');
            }
        };
        checkSession();
    }, []);

    if (!email) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-background">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle>Invalid Request</CardTitle>
                        <CardDescription>
                            No email address was provided. Please sign up to continue.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button
                            onClick={() => router.push('/register')}
                            variant="outline"
                            className="w-full gap-1.5"
                        >
                            <ArrowLeft className="size-4 shrink-0" />
                            Return to Sign Up
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
                        <Mail className="w-8 h-8 text-tertiary-foreground" />
                    </div>
                    <div className="space-y-2">
                        <CardTitle className="text-xl font-semibold tracking-tight">
                            Verify Your Email Address
                        </CardTitle>
                        <CardDescription className="text-[13px] leading-snug">
                            {fromRegister
                                ? 'Thank you for signing up. To complete your registration, please verify your email address.'
                                : 'Please verify your email address to access your account.'
                            }
                        </CardDescription>
                    </div>
                    <div className="pt-2">
                        <p className="text-xs text-muted-foreground mb-2">
                            Verification email sent to
                        </p>
                        <div className="inline-block px-4 py-2 bg-muted/50 rounded-md border border-border/50">
                            <p className="text-sm font-medium">{email}</p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {message && (
                        <div className="px-4 py-3 rounded-lg bg-muted/50 border border-border/50">
                            <p className="text-sm text-center text-muted-foreground">
                                {message}
                            </p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <Button
                            onClick={resendEmail}
                            disabled={resending}
                            className="w-full"
                            size="lg"
                        >
                            {resending ? (
                                <span className="inline-flex items-center gap-1.5">
                                    <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                                    Sending verification email...
                                </span>
                            ) : (
                                'Resend Verification Email'
                            )}
                        </Button>

                        <Button
                            onClick={() => router.push("/login")}
                            variant="outline"
                            size="lg"
                            className="w-full"
                        >
                            Go to Login
                        </Button>
                    </div>
                </CardContent>

                <CardFooter className="justify-center">
                    <p className="text-xs text-muted-foreground text-center">
                        Didn&apos;t receive the email? Check your spam folder or click resend above.
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<PageLoading />}>
            <VerifyEmailContent />
        </Suspense>
    );
}