import { cn } from "@/lib/utils";

import type { OpenNowActivityTag } from "../types/open-to-connect.types";

type Props = {
  activities: readonly OpenNowActivityTag[];
  className?: string;
  max?: number;
};

export function OpenNowActivityChips({ activities, className, max = 3 }: Props) {
  if (activities.length === 0) return null;
  const visible = activities.slice(0, max);
  const extra = activities.length - visible.length;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {visible.map((activity) => {
        const label = activity.detail?.trim()
          ? `${activity.displayName} · ${activity.detail.trim()}`
          : activity.displayName;
        return (
          <span
            key={activity.activityId}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/50 bg-background px-2.5 py-1 text-[11px] font-medium text-foreground"
          >
            {activity.emoji ? <span aria-hidden>{activity.emoji}</span> : null}
            <span className="truncate">{label}</span>
          </span>
        );
      })}
      {extra > 0 ? (
        <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] text-muted-foreground">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}
