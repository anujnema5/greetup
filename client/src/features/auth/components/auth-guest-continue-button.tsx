"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TRY_ROUTE } from "@/features/guest-try/constants/try-routes";
import { AUTH_PAGES } from "@/lib/copy/user-messages";

export function AuthGuestContinueButton() {
  return (
    <>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      <Button variant="outline" className="w-full" asChild>
        <Link href={TRY_ROUTE}>{AUTH_PAGES.continueAsGuest}</Link>
      </Button>
    </>
  );
}
