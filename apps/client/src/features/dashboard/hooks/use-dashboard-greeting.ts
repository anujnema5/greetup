"use client";

import { useMyProfile } from "@/features/profile-setup/api";
import { useClientMounted } from "@/features/app-shell/hooks/use-client-mounted";
import { resolvePageHeaderDisplayName } from "@/features/app-shell/lib/page-header-account";
import type { PageHeaderSessionUser } from "@/features/app-shell/types/page-header-account.types";
import { useSession } from "@/lib/auth-client";

import { DASHBOARD_GREETING_SUBTITLE, timeGreeting } from "../lib/time-greeting";
import type { DashboardGreeting } from "../types/dashboard-greeting.types";

export function useDashboardGreeting(): DashboardGreeting {
  const { data: session } = useSession();
  const { data: myProfileData } = useMyProfile();
  const mounted = useClientMounted();

  const sessionUser = session?.user as PageHeaderSessionUser | undefined;
  const profileDisplayName = myProfileData?.displayName?.trim() || "";
  const displayName = resolvePageHeaderDisplayName(profileDisplayName, sessionUser);
  const firstName = displayName.split(/\s+/).filter(Boolean)[0] ?? "";
  const greeting = timeGreeting();

  return {
    title: mounted && firstName ? `${greeting}, ${firstName}` : greeting,
    subtitle: DASHBOARD_GREETING_SUBTITLE,
  };
}
