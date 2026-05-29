"use client";

import Link from "next/link";
import { ArrowLeft, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CIRCLES_BROWSE_PAGE } from "../../constants/circles-browse-copy";
import { CIRCLES_BROWSE_ON_PRIMARY } from "../../lib/circles-browse-ui";

type CirclesBrowseHeaderProps = {
  onStartCircle: () => void;
};

export function CirclesBrowseHeader({ onStartCircle }: CirclesBrowseHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
      <div className="relative flex items-center justify-between gap-3 px-4 md:px-8 lg:px-10 py-4 w-full">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/home"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={CIRCLES_BROWSE_PAGE.backLabel}
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-foreground leading-tight tracking-tight">
              {CIRCLES_BROWSE_PAGE.title}
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
              {CIRCLES_BROWSE_PAGE.subtitle}
            </p>
          </div>
        </div>
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
      </div>
    </header>
  );
}
