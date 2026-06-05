"use client";

import { UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/features/app-shell";
import { cn } from "@/lib/utils";
import { CIRCLES_BROWSE_PAGE } from "../../constants/circles-browse-copy";
import { CIRCLES_BROWSE_ON_PRIMARY } from "../../lib/circles-browse-ui";
import type { CirclesBrowseHeaderProps } from "../../types/circles-browse-header.types";

export function CirclesBrowseHeader({ onStartCircle }: CirclesBrowseHeaderProps) {
  return (
    <PageHeader
      title={CIRCLES_BROWSE_PAGE.title}
      subtitle={CIRCLES_BROWSE_PAGE.subtitle}
      backHref="/home"
      backLabel={CIRCLES_BROWSE_PAGE.backLabel}
      actions={
        <Button
          type="button"
          size="sm"
          className={cn("shrink-0 gap-1.5 rounded-full", CIRCLES_BROWSE_ON_PRIMARY)}
          onClick={onStartCircle}
        >
          <UsersRound className="size-3.5" aria-hidden />
          <span className="hidden min-[400px]:inline">{CIRCLES_BROWSE_PAGE.startCircle}</span>
          <span className="min-[400px]:hidden">Start</span>
        </Button>
      }
    />
  );
}
