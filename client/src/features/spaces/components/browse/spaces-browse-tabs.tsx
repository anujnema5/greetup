"use client";

import { Compass, LayoutGrid, UserRound, UsersRound } from "lucide-react";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { SPACES_BROWSE_TABS } from "../../constants/spaces-browse-copy";
import type { SpacesBrowseTab } from "../../types/spaces-browse.types";

const TAB_ICONS: Record<SpacesBrowseTab, typeof LayoutGrid> = {
  all: LayoutGrid,
  invited: UserRound,
  mine: UsersRound,
  discover: Compass,
};

const tabTriggerClass = cn(
  "rounded-lg border border-transparent px-2 text-[11px] font-medium text-muted-foreground sm:text-xs",
  "data-[state=active]:border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm",
  "dark:data-[state=active]:!bg-primary dark:data-[state=active]:!text-primary-foreground",
);

export function SpacesBrowseTabsList() {
  return (
    <TabsList className="grid h-10 w-full grid-cols-4 gap-1 rounded-xl border border-border bg-muted/30 p-1">
      {SPACES_BROWSE_TABS.map(({ value, label }) => {
        const Icon = TAB_ICONS[value];
        return (
          <TabsTrigger key={value} value={value} className={tabTriggerClass}>
            <Icon className="size-3.5 shrink-0 sm:mr-1" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.slice(0, 3)}</span>
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
}
