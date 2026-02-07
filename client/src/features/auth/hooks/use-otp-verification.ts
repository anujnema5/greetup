import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const otpSchema = z.object({
    otp: z
        .string()
        .min(6, "OTP must be 6 digits")
        .max(6, "OTP must be 6 digits"),
});

export function useOTPVerification(phoneNumber: string) {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof otpSchema>>({
        resolver: zodResolver(otpSchema),
        defaultValues: {
            otp: "",
        },
    });

    const mockVerifyAPI = async (otp: string) => {
        await new Promise((res) => setTimeout(res, 1000));
        return { success: otp === "123456" }; // change logic for production
    };

    const mockResendAPI = async () => {
        await new Promise((res) => setTimeout(res, 1000));
        return { success: true };
    };

    const verifyOTP = useCallback(
        async (otp: string) => {
            setIsLoading(true);
            try {
                const response = await mockVerifyAPI(otp);
                return response;
            } catch (error) {
                return { success: false };
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    const resendOTP = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await mockResendAPI();
            return response;
        } catch (error) {
            return { success: false };
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        form,
        verifyOTP,
        resendOTP,
        isLoading,
    };
}
