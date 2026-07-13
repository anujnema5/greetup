"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useEmailLogin } from "../hooks/use-email-login";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const EmailLoginForm = () => {
  const { emailForm, handleEmailSubmit, isLoading } = useEmailLogin();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Form {...emailForm}>
      <form
        onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
        className="w-full space-y-4"
      >
        {/* Email Field */}
        <FormField
          control={emailForm.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="Email"
                  className="w-full placeholder:text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password Field */}
        <FormField
          control={emailForm.control}
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

        <div className="flex items-center justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:underline"
          >
            Forgot password
          </Link>
        </div>

        {/* Submit Button */}
        <Button type="submit" className="w-full mt-4" disabled={isLoading}>
          {isLoading ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              Signing in...
            </span>
          ) : (
            "Continue with Email"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default EmailLoginForm;
