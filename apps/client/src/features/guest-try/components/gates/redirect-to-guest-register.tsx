"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { BrandSpinner } from "@/components/brand-spinner";
import { GUEST_TRIAL_FLOW } from "@/lib/copy/user-messages";

import { TRY_SIGNUP_ROUTE } from "../../constants/try-routes";
import { markTryConsumedLocally } from "../../lib/try-navigation";
import { TryLayout } from "../layout/try-layout";

export function RedirectToGuestRegister() {
  const router = useRouter();

  useEffect(() => {
    markTryConsumedLocally();
    router.replace(TRY_SIGNUP_ROUTE);
  }, [router]);

  return (
    <TryLayout showTagline={false}>
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <BrandSpinner size="sm" label={GUEST_TRIAL_FLOW.loading.redirect} />
        <p className="text-sm text-muted-foreground">{GUEST_TRIAL_FLOW.loading.redirect}</p>
      </div>
    </TryLayout>
  );
}
