import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { authClient } from "@/lib/auth-client";

const resetPasswordSchema = z
    .object({
        password: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function useResetPassword() {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const form = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (data: ResetPasswordFormValues) => {
        if (!token) {
            form.setError("password", {
                type: "manual",
                message: "Invalid reset token",
            });
            return;
        }

        setIsLoading(true);
        try {
            await authClient.resetPassword({
                newPassword: data.password,
                token,
            });

            setResetSuccess(true);
            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push("/login");
            }, 3000);
        } catch (error) {
            console.error("Error resetting password:", error);
            form.setError("password", {
                type: "manual",
                message: "Failed to reset password. The link may have expired.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const toggleShowPassword = () => setShowPassword(!showPassword);
    const toggleShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

    return {
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
    };
}