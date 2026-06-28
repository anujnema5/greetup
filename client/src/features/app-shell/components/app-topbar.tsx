"use client";

import { memo, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Bell, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStartCircleModal } from "@/features/circles";
import { formatNotificationTime } from "@/features/notifications/utils/notification-ui";
import { EXPLORE, DASHBOARD_SECTIONS } from "@/lib/copy/user-messages";
import { cn } from "@/lib/utils";

import { PageHeaderAccountMenu } from "./page-header/page-header-account-menu";
import { usePageHeaderNotifications } from "../hooks/use-page-header-notifications";

export type AppTopbarProps = {
  /** When set with `onSearchQueryChange`, search is editable on the current page. */
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  /** Show the start-circle action (Explore only). */
  showStartCircle?: boolean;
};

function AppTopbarStartCircleButton() {
  const { openModal } = useStartCircleModal();

  return (
    <Button
      type="button"
      size="sm"
      className="hidden shrink-0 gap-1.5 rounded-full sm:inline-flex"
      onClick={openModal}
    >
      <Plus className="size-3.5" strokeWidth={2.25} aria-hidden />
      {DASHBOARD_SECTIONS.startCircle}
    </Button>
  );
}

function AppTopbarInner({
  searchQuery = "",
  onSearchQueryChange,
  showStartCircle = false,
}: AppTopbarProps) {
  const router = useRouter();
  const notifications = usePageHeaderNotifications();
  const isInteractiveSearch = onSearchQueryChange != null;

  const goToExplore = useCallback(() => {
    router.push("/explore");
  }, [router]);

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <label
        className={cn(
          "flex h-9 max-w-[480px] flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3",
          "text-sm text-muted-foreground transition-colors duration-150",
          "focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-ring/20",
          !isInteractiveSearch && "cursor-text",
        )}
      >
        <Search className="size-[18px] shrink-0" aria-hidden />
        <span className="sr-only">{EXPLORE.searchPlaceholder}</span>
        <input
          type="search"
          readOnly={!isInteractiveSearch}
          value={isInteractiveSearch ? searchQuery : undefined}
          onChange={
            isInteractiveSearch
              ? (e) => onSearchQueryChange(e.target.value)
              : undefined
          }
          onFocus={!isInteractiveSearch ? goToExplore : undefined}
          onClick={!isInteractiveSearch ? goToExplore : undefined}
          placeholder={EXPLORE.searchPlaceholder}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            "w-full border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground",
            !isInteractiveSearch && "cursor-pointer",
          )}
        />
      </label>

      <div className="flex shrink-0 items-center gap-2">
        <DropdownMenu open={notifications.isOpen} onOpenChange={notifications.onOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Notifications${notifications.unreadCount > 0 ? ` (${notifications.unreadCount} unread)` : ""}`}
              className="relative shrink-0 rounded-xl"
            >
              <Bell className="size-4" />
              {notifications.unreadCount > 0 ? (
                <span
                  className="absolute right-2 top-1.5 size-2 rounded-full bg-primary ring-2 ring-card"
                  aria-hidden
                />
              ) : null}
            </Button>
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

        {showStartCircle ? <AppTopbarStartCircleButton /> : null}

        <PageHeaderAccountMenu />
      </div>
    </div>
  );
}

export const AppTopbar = memo(AppTopbarInner);

export function AppTopbarShell({ children }: { children: ReactNode }) {
  return (
    <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="w-full px-4 lg:px-5">{children}</div>
    </div>
  );
}
