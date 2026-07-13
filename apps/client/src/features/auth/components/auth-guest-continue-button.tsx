"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { TRY_ROUTE } from "@/features/guest-try/constants/try-routes";
import { AUTH_PAGES } from "@/lib/copy/user-messages";

import { AuthFormDivider } from "./auth-form-divider";

export function AuthGuestContinueButton() {
  return (
    <section aria-label={AUTH_PAGES.guestSectionLabel} className="space-y-4">
      <AuthFormDivider label="Or" />

      <Button variant="outline" className="w-full" asChild>
        <Link href={TRY_ROUTE}>{AUTH_PAGES.continueAsGuest}</Link>
      </Button>
    </section>
  );
}
