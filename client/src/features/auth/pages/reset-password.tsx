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
import { Loader2, Eye, EyeOff, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/logo";
import Link from "next/link";
import { useResetPassword } from "@/features/auth/hooks/use-reset-password";

export default function ResetPasswordPage() {
    const {
        form,
        isLoading,
        showPassword,
        showConfirmPassword,
        resetSuccess,
        token,
        router,
        onSubmit,
        toggleShowPassword,
        toggleShowConfirmPassword,
    } = useResetPassword();

    // Success state
    if (resetSuccess) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background via-background to-primary/5 p-4">
                <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 shadow-xl">
                    <div className="flex justify-center">
                        <div className="rounded-full bg-primary/10 p-4">
                            <CheckCircle2 className="h-12 w-12 text-primary" />
                        </div>
                    </div>

                    <div className="space-y-2 text-center">
                        <h1 className="text-xl font-bold tracking-tight">Password reset successful!</h1>
                        <p className="text-sm text-muted-foreground">
                            Your password has been successfully reset.
                        </p>
                        <p className="pt-2 text-sm text-muted-foreground">
                            You can now login with your new password.
                        </p>
                    </div>

                    <Button
                        className="w-full"
                        onClick={() => router.push("/login")}
                    >
                        Continue to login
                    </Button>
                </div>
            </div>
        );
    }

    // Invalid token state
    if (!token) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background via-background to-primary/5 p-4">
                <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 shadow-xl">
                    <div className="flex justify-center">
                        <div className="rounded-full bg-destructive/10 p-4">
                            <AlertCircle className="h-12 w-12 text-destructive" />
                        </div>
                    </div>

                    <div className="space-y-2 text-center">
                        <h1 className="text-xl font-bold tracking-tight">Invalid Reset Link</h1>
                        <p className="text-sm text-muted-foreground">
                            This password reset link is invalid or has expired.
                        </p>
                        <p className="pt-2 text-sm text-muted-foreground">
                            Please request a new password reset link.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Button
                            className="w-full"
                            onClick={() => router.push("/forgot-password")}
                        >
                            Request new link
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => router.push("/login")}
                        >
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
                        <h1 className="text-xl font-bold tracking-tight">
                            Reset your password
                        </h1>
                        <p className="text-[13px] leading-snug text-muted-foreground">
                            Enter your new password below. Make sure it&apos;s at least 8 characters long.
                        </p>
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm font-medium">
                                        New Password
                                    </FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Enter new password"
                                                className="pl-10 pr-10"
                                                {...field}
                                                disabled={isLoading}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={toggleShowPassword}
                                                disabled={isLoading}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm font-medium">
                                        Confirm Password
                                    </FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                type={showConfirmPassword ? "text" : "password"}
                                                placeholder="Confirm new password"
                                                className="pl-10 pr-10"
                                                {...field}
                                                disabled={isLoading}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={toggleShowConfirmPassword}
                                                disabled={isLoading}
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </Button>
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
                                    Resetting password...
                                </span>
                            ) : (
                                "Reset password"
                            )}
                        </Button>

                        <div className="text-center">
                            <Link
                                href="/login"
                                className="text-sm font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
                            >
                                Back to login
                            </Link>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
}