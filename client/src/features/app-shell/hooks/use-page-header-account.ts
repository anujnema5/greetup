"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { useGetMyProfileQuery } from "@/features/profile-setup/components/profile-setup-api";
import { signOut, useSession } from "@/lib/auth-client";
import { getProfileImageUrl } from "@/lib/ui/profile-image";

import { useClientMounted } from "./use-client-mounted";
import {
  resolvePageHeaderAccountSubtitle,
  resolvePageHeaderDisplayName,
} from "../lib/page-header-account";
import type { PageHeaderAccountState, PageHeaderSessionUser } from "../types/page-header-account.types";

export function usePageHeaderAccount(): PageHeaderAccountState {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: myProfileData } = useGetMyProfileQuery();
  const mounted = useClientMounted();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const sessionUser = session?.user as PageHeaderSessionUser | undefined;
  const profileDisplayName = myProfileData?.data?.displayName?.trim() || "";
  const displayName = resolvePageHeaderDisplayName(profileDisplayName, sessionUser);
  const avatarSrc = getProfileImageUrl(mounted ? (sessionUser?.image ?? null) : null);
  const accountSubtitle = resolvePageHeaderAccountSubtitle(sessionUser);

  const onGoToProfile = useCallback(() => {
    router.push("/profile");
  }, [router]);

  const onGoToSettings = useCallback(() => {
    router.push("/settings");
  }, [router]);

  const onLogout = useCallback(async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
      router.push("/login");
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut, router]);

  return {
    displayName,
    accountSubtitle,
    avatarSrc,
    isSigningOut,
    onGoToProfile,
    onGoToSettings,
    onLogout,
  };
}
