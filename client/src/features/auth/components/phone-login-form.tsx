"use client";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PhoneInput } from "@/components/ui/phone-input";
import { usePhoneLogin } from "../hooks/use-phone-login";
import { Loader2 } from "lucide-react"; // Using a spinner icon from lucide

interface PhoneLoginFormProps {
    onOTPSent: (phone: string) => void;
}

const PhoneLoginForm = ({ onOTPSent }: PhoneLoginFormProps) => {
    const { form, sendOTP, isLoading } = usePhoneLogin();

    const onSubmit = async (data: { phone: string }) => {
        const result = await sendOTP(data.phone);
        if (result.success) {
            onOTPSent(data.phone);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                                <PhoneInput
                                    {...field}
                                    placeholder="Enter phone number"
                                    defaultCountry="US"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full flex items-center justify-center" disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Sending...
                        </>
                    ) : (
                        "Send OTP"
                    )}
                </Button>
            </form>
        </Form>
    );
}

export default PhoneLoginForm;
