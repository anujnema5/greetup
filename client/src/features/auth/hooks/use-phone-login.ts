import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { phoneLoginSchema, type PhoneLoginInput } from "../schemas/auth.schemas";

export function usePhoneLogin() {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<PhoneLoginInput>({
        resolver: zodResolver(phoneLoginSchema),
        defaultValues: { phone: "" },
    });

    const sendOTP = async (phone: string) => {
        setIsLoading(true);
        try {
            const { data, error } = await authClient.phoneNumber.sendOtp({
                phoneNumber: phone,
            });

            if (error) {
                handleOTPError(error, form);
                return { success: false, error };
            }

            toast.success("OTP sent successfully!");
            return { success: true, data };
        } catch (err) {
            console.error("Unexpected error:", err);
            toast.error("Something went wrong. Please try again.");
            return { success: false, error: err };
        } finally {
            setIsLoading(false);
        }
    };

    return { form, sendOTP, isLoading };
}

function handleOTPError(error: any, form: any) {
    console.error("OTP Error:", error);
    toast.error(error.message);

    switch (error.code) {
        case "INVALID_PHONE":
            form.setError("phone", { message: "Phone number not valid" });
            break;
        case "RATE_LIMITED":
            toast.error("Too many attempts. Try again in a moment.");
            break;
        default:
            toast.error("Failed to send OTP. Please try again.");
    }
}