import { z } from "zod";

export const emailLoginSchema = z.object({
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const phoneLoginSchema = z.object({
    phone: z.string().min(10, "Please enter a valid phone number"),
});

/** Firebase Phone Auth SMS code (exactly 6 digits in the UI before `digitsOnlyOtp` in context). */
export const phoneOtpVerificationSchema = z.object({
    otp: z.string().length(6, "Enter the 6-digit code"),
});

export const emailRegisterSchema = z
    .object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Please enter a valid email address"),
        password: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                "Password must contain at least one uppercase letter, one lowercase letter, and one number"
            ),
        confirmPassword: z.string(),
        termsAccepted: z.boolean().refine((val) => val === true, {
            message: "You must accept the terms and conditions",
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    });

export type EmailRegisterInput = z.infer<typeof emailRegisterSchema>;
export type EmailLoginInput = z.infer<typeof emailLoginSchema>;
export type PhoneLoginInput = z.infer<typeof phoneLoginSchema>;
export type PhoneOtpVerificationInput = z.infer<typeof phoneOtpVerificationSchema>;