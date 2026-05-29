"use client";

import type { LucideIcon } from "lucide-react";

import {
  ActiveCircleCardGrid,
  type ActiveCircleCardGridHandlers,
} from "../active-circle-card";
import type { ActiveCircleItem } from "../../types/circles-api.types";
import type { CirclesBrowseSectionCopy } from "../../types/circles-browse.types";
import { CirclesBrowseSectionEmpty } from "./circles-browse-section-empty";

type CirclesBrowseSectionProps = {
  copy: CirclesBrowseSectionCopy;
  items: ActiveCircleItem[];
  cardHandlers: ActiveCircleCardGridHandlers;
  renderBadge?: (item: ActiveCircleItem) => React.ReactNode;
  icon?: LucideIcon;
  showEmptyState?: boolean;
};

export function CirclesBrowseSection({
  copy,
  items,
  cardHandlers,
  renderBadge,
  icon: Icon,
  showEmptyState = false,
}: CirclesBrowseSectionProps) {
  if (items.length === 0) {
    return showEmptyState ? <CirclesBrowseSectionEmpty message={copy.empty} /> : null;
  }

  return (
    <section className="rounded-2xl border border-border/60 bg-card/30 p-4 md:p-5 shadow-sm backdrop-blur-sm">
      <CirclesBrowseSectionHeader title={copy.title} description={copy.description} icon={Icon} />
      <ActiveCircleCardGrid
        items={items}
        layout="responsive"
        density="browse"
        renderBadge={renderBadge}
        className="gap-4"
        {...cardHandlers}
      />
    </section>
  );
}

export function CirclesBrowseSectionHeader({
  title,
  description,
  icon: Icon,
}: Pick<CirclesBrowseSectionCopy, "title" | "description"> & { icon?: LucideIcon }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      {Icon ? (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
          <Icon className="size-4" strokeWidth={1.75} aria-hidden />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-foreground tracking-tight">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
