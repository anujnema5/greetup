"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { useMyProfile } from "@/features/profile-setup/api";
import { signOut, useSession } from "@/lib/auth-client";

import { useClientMounted } from "./use-client-mounted";
import {
  resolvePageHeaderAccountSubtitle,
  resolvePageHeaderDisplayName,
} from "../lib/page-header-account";
import type { PageHeaderAccountState, PageHeaderSessionUser } from "../types/page-header-account.types";

export function usePageHeaderAccount(): PageHeaderAccountState {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: myProfileData } = useMyProfile();
  const mounted = useClientMounted();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const sessionUser = session?.user as PageHeaderSessionUser | undefined;
  const profileDisplayName = myProfileData?.displayName?.trim() || "";
  const displayName = resolvePageHeaderDisplayName(profileDisplayName, sessionUser);
  const avatarImage = mounted ? (sessionUser?.image?.trim() || null) : null;
  const avatarSeed = sessionUser?.id ?? displayName;
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
    avatarImage,
    avatarSeed,
    isSigningOut,
    onGoToProfile,
    onGoToSettings,
    onLogout,
  };
}
