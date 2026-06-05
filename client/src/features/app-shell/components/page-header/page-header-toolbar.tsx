"use client";

import { memo } from "react";
import { Bell, LogOut, Settings, User } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatNotificationTime } from "@/features/notifications/utils/notification-ui";

import { usePageHeaderAccount } from "../../hooks/use-page-header-account";
import { usePageHeaderNotifications } from "../../hooks/use-page-header-notifications";

function PageHeaderToolbarInner() {
  const account = usePageHeaderAccount();
  const notifications = usePageHeaderNotifications();

  return (
    <>
      <DropdownMenu open={notifications.isOpen} onOpenChange={notifications.onOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Notifications${notifications.unreadCount > 0 ? ` (${notifications.unreadCount} unread)` : ""}`}
            className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
          >
            <span className="relative inline-flex">
              <Bell size={17} className="shrink-0" />
              {notifications.unreadCount > 0 ? (
                <span className="absolute right-0 top-0 z-10 inline-flex min-h-4 min-w-4 translate-x-[45%] -translate-y-[42%] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                  {notifications.unreadBadgeLabel}
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
            {notifications.isLoading ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                Loading notifications...
              </p>
            ) : notifications.notifications.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">No notifications yet</p>
            ) : (
              notifications.notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void notifications.onOpenNotification(item)}
                  disabled={notifications.isMarkingRead}
                  className="w-full cursor-pointer rounded-sm px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:bg-muted disabled:opacity-60"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 rounded-full ${item.readAt ? "bg-transparent" : "bg-primary"}`}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">{item.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
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
            className="h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={account.avatarSrc} alt="Profile" className="h-full w-full object-cover" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-56">
          <DropdownMenuLabel className="space-y-0.5">
            <p className="truncate text-sm font-medium text-foreground">
              {account.displayName || "My Account"}
            </p>
            {account.accountSubtitle ? (
              <p className="truncate text-xs font-normal text-muted-foreground">
                {account.accountSubtitle}
              </p>
            ) : null}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer" onClick={account.onGoToProfile}>
            <User className="text-current" />
            View profile
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={account.onGoToSettings}>
            <Settings className="text-current" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            variant="destructive"
            disabled={account.isSigningOut}
            onClick={() => void account.onLogout()}
          >
            <LogOut className="text-current" />
            {account.isSigningOut ? "Logging out..." : "Logout"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export const PageHeaderToolbar = memo(PageHeaderToolbarInner);
