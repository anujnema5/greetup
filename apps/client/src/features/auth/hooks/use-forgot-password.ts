import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { authClient } from "@/lib/auth-client";

const forgotPasswordSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function useForgotPassword() {
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const form = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: "",
        },
    });

    const onSubmit = async (data: ForgotPasswordFormValues) => {
        setIsLoading(true);
        try {
            await authClient.requestPasswordReset({
                email: data.email,
                redirectTo: "/reset-password",
            });
            setEmailSent(true);
        } catch (error) {
            console.error("Error sending reset email:", error);
            form.setError("email", {
                type: "manual",
                message: "Failed to send reset email. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const resetEmailSent = () => setEmailSent(false);

    return {
        form,
        isLoading,
        emailSent,
        onSubmit,
        resetEmailSent,
    };
}