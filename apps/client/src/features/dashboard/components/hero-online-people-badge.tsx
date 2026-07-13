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
    <div className="inline-flex items-center gap-2 rounded-full bg-success-muted/80 px-3 py-1 text-xs font-medium text-success-foreground">
      <span className="dash-live-dot size-1.5 shrink-0 rounded-full bg-success" aria-hidden />
      <span>{DASHBOARD_HERO.onlineBadge(onlinePeopleCount)}</span>
    </div>
  );
}
