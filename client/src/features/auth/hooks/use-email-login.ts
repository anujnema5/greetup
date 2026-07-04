import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { EmailLoginInput, emailLoginSchema } from "../schemas/auth.schemas";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { getAuthCallbackUrl } from "../lib/auth-callback-url";
import { getAuthErrorMessage } from "../utils/auth-error";
import { useRouter } from "next/navigation";

export function useEmailLogin() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const emailForm = useForm<EmailLoginInput>({
        resolver: zodResolver(emailLoginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const handleEmailSubmit = useCallback(
        async (values: EmailLoginInput) => {
            setIsLoading(true);
            try {
                const res = await authClient.signIn.email({
                    email: values.email,
                    password: values.password,
                    rememberMe: true,
                    callbackURL: getAuthCallbackUrl(),
                })

                if (res.error?.code === 'EMAIL_NOT_VERIFIED') {
                    router.push(`/verify-email?email=${encodeURIComponent(values.email)}&from=login`);
                    return;
                }

                if (res.error) {
                    toast.error(getAuthErrorMessage(res.error));
                    return;
                }

                if (res.data) {
                    router.push(getAuthCallbackUrl());
                }
            } catch {
                return { success: false };
            } finally {
                setIsLoading(false);
            }
        },
        [router],
    );

    return {
        emailForm,
        handleEmailSubmit,
        isLoading,
    };
}
