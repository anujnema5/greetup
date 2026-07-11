"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { PageLoading } from "@/components/page-loading";
import { POST_AUTH_PATH } from "@/features/auth/lib/auth-callback-url";
import { useOnboardingGate } from "@/features/auth/hooks/use-onboarding-gate";

function shouldSkipOnboardingGate(pathname: string): boolean {
  return pathname === "/try" || pathname.startsWith("/try/");
}

function isOnboardingPath(pathname: string): boolean {
  return (
    pathname === POST_AUTH_PATH || pathname.startsWith(`${POST_AUTH_PATH}/`)
  );
}

/** Client-side safety net when edge proxy cannot reach the auth API. */
export function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const skip = shouldSkipOnboardingGate(pathname);

  const { isGuest, needsOnboarding, isReady } = useOnboardingGate({
    enabled: !skip,
  });

  useEffect(() => {
    if (skip || !needsOnboarding || isOnboardingPath(pathname)) return;
    router.replace(POST_AUTH_PATH);
  }, [skip, needsOnboarding, pathname, router]);

  if (skip || isGuest) {
    return <>{children}</>;
  }

  if (!isReady) {
    return <PageLoading />;
  }

  if (needsOnboarding) {
    return null;
  }

  return <>{children}</>;
}
