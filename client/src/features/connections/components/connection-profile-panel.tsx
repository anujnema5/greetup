"use client";

import { Users, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PublicProfileContent } from "@/features/user-profile/components/public-profile-content";
import { CONNECTIONS } from "@/lib/copy/user-messages";
import { cn } from "@/lib/utils";

type ConnectionProfilePanelProps = {
  username: string;
  onClose: () => void;
  className?: string;
};

export function ConnectionProfilePanel({
  username,
  onClose,
  className,
}: ConnectionProfilePanelProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col bg-background",
        "animate-in fade-in slide-in-from-right-3 duration-300",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">Profile</p>
          <p className="truncate text-[11px] text-muted-foreground">@{username}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
          onClick={onClose}
          aria-label="Close profile panel"
        >
          <X className="size-4" strokeWidth={2} />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
        <PublicProfileContent
          key={username}
          username={username}
          embedded
          onAfterConnectionRemoved={onClose}
          unavailableBackHref="/connections"
          unavailableBackLabel="Back to connections"
        />
      </div>
    </div>
  );
}

export function ConnectionProfileEmptyState({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-full flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner shadow-primary/5">
        <Users className="size-7 opacity-90" strokeWidth={1.75} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{CONNECTIONS.emptyDetailTitle}</p>
        <p className="mx-auto max-w-[260px] text-xs text-muted-foreground">
          {CONNECTIONS.emptyDetailSubtitle}
        </p>
      </div>
    </div>
  );
}
