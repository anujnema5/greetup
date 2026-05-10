import { useCallback, useState } from "react";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { authClient } from "@/lib/auth-client";
import { CURRENT_HOST } from "@/shared/constants";
import { getAuthErrorMessage } from "../utils/auth-error";
import { toast } from "sonner";
import { EmailRegisterInput, emailRegisterSchema } from "../schemas/auth.schemas";
import { useRouter } from "next/navigation";

export function useEmailRegister() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const registerForm = useForm<EmailRegisterInput>({
        resolver: zodResolver(emailRegisterSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
            termsAccepted: true,
        },
    });

    const handleRegisterSubmit = useCallback(async (userData: EmailRegisterInput) => {
        setIsLoading(true);
        try {
            const { error, data } = await authClient.signUp.email({
                email: userData.email,
                password: userData.password,
                name: userData.name,
                callbackURL: CURRENT_HOST,
            });

            // if (error?.code === 'EMAIL_NOT_VERIFIED') {
            router.push(`/verify-email?email=${encodeURIComponent(userData?.email)}&from=register`);
            // return;
            // }

            // if (error) {
            //     toast.error(getAuthErrorMessage(error));
            //     return;
            // }

            toast.success("Account created! Please check your email.");
        } catch (error) {
            console.error(error);
            toast.error(getAuthErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    return {
        registerForm,
        handleRegisterSubmit,
        isLoading
    }
}