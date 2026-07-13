"use client";

import type { LucideIcon } from "lucide-react";

import {
  ActiveSpaceCardGrid,
  type ActiveSpaceCardGridHandlers,
} from "../active-space-card";
import type { ActiveSpaceItem } from "../../types/spaces-api.types";
import type { SpacesBrowseSectionCopy } from "../../types/spaces-browse.types";
import { SpacesBrowseSectionEmpty } from "./spaces-browse-section-empty";

type SpacesBrowseSectionProps = {
  copy: SpacesBrowseSectionCopy;
  items: ActiveSpaceItem[];
  cardHandlers: ActiveSpaceCardGridHandlers;
  renderBadge?: (item: ActiveSpaceItem) => React.ReactNode;
  icon?: LucideIcon;
  showEmptyState?: boolean;
};

export function SpacesBrowseSection({
  copy,
  items,
  cardHandlers,
  renderBadge,
  icon: Icon,
  showEmptyState = false,
}: SpacesBrowseSectionProps) {
  if (items.length === 0) {
    return showEmptyState ? <SpacesBrowseSectionEmpty message={copy.empty} /> : null;
  }

  return (
    <section className="rounded-2xl border border-border bg-card/40 p-4 md:p-5">
      <SpacesBrowseSectionHeader title={copy.title} description={copy.description} icon={Icon} />
      <ActiveSpaceCardGrid
        items={items}
        renderBadge={renderBadge}
        className="gap-3"
        {...cardHandlers}
      />
    </section>
  );
}

export function SpacesBrowseSectionHeader({
  title,
  description,
  icon: Icon,
}: Pick<SpacesBrowseSectionCopy, "title" | "description"> & { icon?: LucideIcon }) {
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
