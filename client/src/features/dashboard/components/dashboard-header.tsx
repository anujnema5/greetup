"use client";

import { memo, useEffect, useState } from "react";
import { Bell, LogOut, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import {
  useGetNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/features/notifications/api/notifications-api";
import type { NotificationItem } from "@/features/notifications/types/notifications-api.types";
import {
  formatNotificationTime,
  notificationRoute,
} from "@/features/notifications/utils/notification-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getProfileImageUrl } from "@/lib/ui/profile-image";
import { useGetMyProfileQuery } from "@/features/profile-setup/components/profile-setup-api";

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function DashboardHeaderInner() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: myProfileData } = useGetMyProfileQuery();
  const [mounted, setMounted] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { data: unreadData } = useGetUnreadNotificationCountQuery(undefined, {
    pollingInterval: 15000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const { data: notificationsData, isFetching: notificationsLoading } = useGetNotificationsQuery(
    { page: 1, limit: 10 },
    {
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );
  const [markNotificationRead, { isLoading: isMarkingRead }] = useMarkNotificationReadMutation();
  const [markAllNotificationsRead] = useMarkAllNotificationsReadMutation();
  useEffect(() => {
    setMounted(true);
  }, []);

  const sessionUser = session?.user as
    | { displayName?: string | null; name?: string | null; email?: string | null; image?: string | null }
    | undefined;
  const profileDisplayName = myProfileData?.data?.displayName?.trim() || "";
  const displayName =
    profileDisplayName || sessionUser?.displayName?.trim() || sessionUser?.name?.trim() || "";
  const firstName = displayName.split(/\s+/).filter(Boolean)[0] ?? "";
  const g = timeGreeting();

  const headline = mounted && firstName ? `${g}, ${firstName}` : g;
  const avatarSrc = getProfileImageUrl(mounted ? (sessionUser?.image ?? null) : null);
  const rawEmail = sessionUser?.email?.trim() ?? "";
  const email = rawEmail.endsWith("@firebase.greetup.local") ? "" : rawEmail;
  const phone = (session?.user as { phoneNumber?: string | null } | undefined)?.phoneNumber?.trim() ?? "";
  const accountSubtitle = email || phone;
  const unreadCount = unreadData?.data?.unreadCount ?? 0;
  const unreadBadgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);
  const notifications = notificationsData?.data?.items ?? [];

  const handleGoToProfile = () => {
    router.push("/profile");
  };

  const handleGoToSettings = () => {
    router.push("/settings");
  };

  const handleLogout = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
      router.push("/login");
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleOpenNotification = async (item: NotificationItem) => {
    if (!item.readAt) {
      try {
        await markNotificationRead({ notificationId: item.id }).unwrap();
      } catch {
        // Best effort. Navigation should still happen.
      }
    }
    setIsNotificationsOpen(false);
    router.push(notificationRoute(item));
  };

  const handleNotificationsOpenChange = (open: boolean) => {
    setIsNotificationsOpen(open);
    if (open && unreadCount > 0) {
      void markAllNotificationsRead()
        .unwrap()
        .catch(() => {
          // Best effort; badge may refresh on next poll.
        });
    }
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-8 py-4 border-b border-border bg-background shadow-sm">
      <div>
        <h1 className="text-[15px] font-semibold text-foreground leading-none">{headline}</h1>
        <p className="text-[11px] text-muted-foreground mt-1">Your space is ready</p>
      </div>
      <div className="flex items-center gap-3">
        <DropdownMenu open={isNotificationsOpen} onOpenChange={handleNotificationsOpenChange}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
              className="relative h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-200 cursor-pointer"
            >
              <span className="relative inline-flex">
                <Bell size={17} className="shrink-0" />
                {unreadCount > 0 ? (
                  <span className="absolute right-0 top-0 z-10 inline-flex min-h-4 min-w-4 translate-x-[45%] -translate-y-[42%] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                    {unreadBadgeLabel}
                  </span>
                ) : null}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-80 p-0">
            <div className="px-3 py-2">
              <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
            </div>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto p-1">
              {notificationsLoading ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">Loading notifications...</p>
              ) : notifications.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">No notifications yet</p>
              ) : (
                notifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void handleOpenNotification(item)}
                    disabled={isMarkingRead}
                    className="w-full text-left rounded-sm px-2 py-2 hover:bg-muted focus-visible:bg-muted transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 rounded-full ${item.readAt ? "bg-transparent" : "bg-primary"}`}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.body}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {formatNotificationTime(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Open profile menu"
              className="h-9 w-9 overflow-hidden rounded-xl bg-muted/30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarSrc} alt="Profile" className="h-full w-full object-cover" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-56">
            <DropdownMenuLabel className="space-y-0.5">
              <p className="truncate text-sm font-medium text-foreground">{displayName || "My Account"}</p>
              {accountSubtitle ? <p className="truncate text-xs font-normal text-muted-foreground">{accountSubtitle}</p> : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={handleGoToProfile}>
              <User className="text-current" />
              View profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={handleGoToSettings}>
              <Settings className="text-current" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              variant="destructive"
              disabled={isSigningOut}
              onClick={handleLogout}
            >
              <LogOut className="text-current" />
              {isSigningOut ? "Logging out..." : "Logout"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export const DashboardHeader = memo(DashboardHeaderInner);
