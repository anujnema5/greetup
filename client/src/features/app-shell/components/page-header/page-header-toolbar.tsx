"use client";

import { memo } from "react";
import { Bell } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatNotificationTime } from "@/features/notifications/utils/notification-ui";

import { usePageHeaderNotifications } from "../../hooks/use-page-header-notifications";
import { PageHeaderAccountMenu } from "./page-header-account-menu";

function PageHeaderToolbarInner() {
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

      <PageHeaderAccountMenu />
    </>
  );
}

export const PageHeaderToolbar = memo(PageHeaderToolbarInner);
