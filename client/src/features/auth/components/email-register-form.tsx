"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useEmailRegister } from "../hooks/use-email-register";

type EmailRegisterFormProps = {
    defaultName?: string;
    emailVerificationCallbackURL?: string;
    verifyEmailFrom?: string;
};

export default function EmailRegisterForm({
    defaultName,
    emailVerificationCallbackURL,
    verifyEmailFrom,
}: EmailRegisterFormProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { handleRegisterSubmit, isLoading, registerForm } = useEmailRegister({
        defaultName,
        emailVerificationCallbackURL,
        verifyEmailFrom,
    });

    useEffect(() => {
        if (!defaultName?.trim()) {
            return;
        }
        const current = registerForm.getValues("name").trim();
        if (!current) {
            registerForm.setValue("name", defaultName.trim());
        }
    }, [defaultName, registerForm]);

    return (
        <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="space-y-4">
                <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Enter your full name"
                                    className="placeholder:text-sm"
                                    {...field}
                                    disabled={isLoading}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="placeholder:text-sm"
                                    {...field}
                                    disabled={isLoading}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Create a password"
                                        className="placeholder:text-sm"
                                        {...field}
                                        disabled={isLoading}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowPassword(!showPassword)}
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
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <Input
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Confirm your password"
                                        className="placeholder:text-sm"
                                        {...field}
                                        disabled={isLoading}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() =>
                                            setShowConfirmPassword(!showConfirmPassword)
                                        }
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

                {/* <FormField
                    control={form.control}
                    name="termsAccepted"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isLoading}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-normal">
                                    I agree to the{""}
                                    <a
                                        href="/terms"
                                        className="text-primary hover:underline"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Terms & Conditions
                                    </a>{""}
                                    and{""}
                                    <a
                                        href="/privacy"
                                        className="text-primary hover:underline"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Privacy Policy
                                    </a>
                                </FormLabel>

                                <FormMessage />
                            </div>
                        </FormItem>
                    )}
                /> */}

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                        <span className="inline-flex items-center gap-1.5">
                            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                            Creating account...
                        </span>
                    ) : (
                        "Create Account"
                    )}
                </Button>
            </form>
        </Form>
    );
}