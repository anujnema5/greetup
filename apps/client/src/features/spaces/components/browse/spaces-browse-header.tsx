"use client";

import { UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/features/app-shell";
import { cn } from "@/lib/utils";
import { SPACES_BROWSE_PAGE } from "../../constants/spaces-browse-copy";
import { SPACES_BROWSE_ON_PRIMARY } from "../../lib/spaces-browse-ui";
import type { SpacesBrowseHeaderProps } from "../../types/spaces-browse-header.types";

export function SpacesBrowseHeader({ onStartSpace }: SpacesBrowseHeaderProps) {
  return (
    <PageHeader
      title={SPACES_BROWSE_PAGE.title}
      subtitle={SPACES_BROWSE_PAGE.subtitle}
      backHref="/home"
      backLabel={SPACES_BROWSE_PAGE.backLabel}
      actions={
        <Button
          type="button"
          size="sm"
          className={cn("shrink-0 gap-1.5 rounded-full", SPACES_BROWSE_ON_PRIMARY)}
          onClick={onStartSpace}
        >
          <UsersRound className="size-3.5" aria-hidden />
          <span className="hidden min-[400px]:inline">{SPACES_BROWSE_PAGE.startSpace}</span>
          <span className="min-[400px]:hidden">Start</span>
        </Button>
      }
    />
  );
}
