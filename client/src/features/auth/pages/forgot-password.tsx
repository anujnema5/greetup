"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/logo";
import Link from "next/link";
import { useForgotPassword } from "@/features/auth/hooks/use-forgot-password";

export default function ForgotPasswordPage() {
    const { form, isLoading, emailSent, onSubmit, resetEmailSent } = useForgotPassword();

    if (emailSent) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background via-background to-primary/5 p-4">
                <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 shadow-xl">
                    <div className="flex justify-center">
                        <div className="rounded-full bg-primary/10 p-4">
                            <CheckCircle2 className="h-12 w-12 text-primary" />
                        </div>
                    </div>

                    <div className="space-y-2 text-center">
                        <h1 className="text-xl font-bold tracking-tight">Check your email</h1>
                        <p className="text-sm text-muted-foreground">
                            We&apos;ve sent a password reset link to
                        </p>
                        <p className="font-medium text-foreground">
                            {form.getValues("email")}
                        </p>
                        <p className="pt-2 text-sm text-muted-foreground">
                            Click the link in the email to reset your password. If you don&apos;t see it,
                            check your spam folder.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Button
                            variant="outline"
                            className="w-full gap-1.5"
                            onClick={resetEmailSent}
                        >
                            <Mail className="size-4 shrink-0" />
                            Try another email
                        </Button>

                        <Button
                            variant="ghost"
                            className="w-full gap-1.5"
                            onClick={() => window.location.href = "/login"}
                        >
                            <ArrowLeft className="size-4 shrink-0" />
                            Back to login
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background via-background to-primary/5 p-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl border bg-card p-8 shadow-xl">
                <div className="space-y-4 text-center">
                    <div className="flex justify-center">
                        <Logo />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-xl my-3 font-bold tracking-tight">
                            Forgot password?
                        </h1>
                        <p className="text-[13px] leading-snug text-muted-foreground">
                            No worries! Enter your email address and we&apos;ll send you a link to reset your
                            password.
                        </p>
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm font-medium">
                                        Email address
                                    </FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                type="email"
                                                placeholder="Enter your email"
                                                className="pl-10"
                                                {...field}
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button
                            type="submit"
                            className="w-full h-11 text-sm font-medium"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="inline-flex items-center gap-1.5">
                                    <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                                    Sending reset link...
                                </span>
                            ) : (
                                "Send reset link"
                            )}
                        </Button>

                        <div className="text-center">
                            <Link
                                href="/login"
                                className="inline-flex items-center text-sm font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
                            >
                                <ArrowLeft className="mr-1 h-4 w-4" />
                                Back to login
                            </Link>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
}