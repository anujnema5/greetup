"use client";

import { DASHBOARD_HERO } from "@/lib/copy/user-messages";

import { useOnlinePeopleCount } from "@/features/presence/hooks/use-online-people-count";

/** Live online count pill — hidden entirely when nobody else is online. */
export function HeroOnlinePeopleBadge() {
  const { showOnlineBadge, onlinePeopleCount } = useOnlinePeopleCount();

  if (!showOnlineBadge) {
    return null;
  }

  return (
    <div className="relative z-10 flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2 backdrop-blur-sm">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 animate-pulse dark:bg-emerald-400" />
      <span className="text-xs text-muted-foreground">
        {DASHBOARD_HERO.onlineBadge(onlinePeopleCount)}
      </span>
    </div>
  );
}
