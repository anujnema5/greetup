"use client";

import { memo } from "react";
import { Video, X, Zap } from "lucide-react";

import { DASHBOARD_HERO, EARLY_RELEASE } from "@/lib/copy/user-messages";
import { TOUR_TARGETS } from "@/features/tour-guide";
import { CircleOrb, useStartCircleModal } from "@/features/circles";
import { MatchOrb } from "./match-orb";
import { HeroOnlinePeopleBadge } from "./hero-online-people-badge";
import { useDashboardInsights } from "../hooks/use-dashboard-insights";

function HeroSectionInner({
  appState,
  onRequestMatch,
  onCancel,
  error,
}: {
  appState: "idle" | "searching" | "proposed" | "matched" | "error";
  onRequestMatch: () => void;
  onCancel: () => void;
  error?: string | null;
}) {
  const { openModal, categoriesLoading, isOpen } = useStartCircleModal();
  const { heroStats, isLoading: insightsLoading } = useDashboardInsights();
  const isSearching = appState === "searching";
  const isProposed = appState === "proposed";

  const heroCopy = isSearching
    ? DASHBOARD_HERO.searching
    : isProposed
      ? DASHBOARD_HERO.proposed
      : DASHBOARD_HERO.idle;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border flex flex-col items-center justify-center gap-4 bg-card py-6 px-4 md:gap-5 md:py-8 md:px-8 bg-hero-card-surface">
      <div className="pointer-events-none absolute inset-0 bg-dot-grid-hero opacity-100" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-[280px] w-[480px] -translate-x-1/2 rounded-full bg-primary/8 blur-[100px] opacity-40 dark:bg-primary/10 dark:opacity-40" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-[280px] w-[280px] rounded-full bg-secondary/5 blur-[80px] opacity-20 dark:bg-secondary/10 dark:opacity-35" />

      <HeroOnlinePeopleBadge />

      <div className="relative z-10 text-center">
        <h2 className="text-[1.75rem] md:text-[2.25rem] font-semibold tracking-tight leading-tight text-foreground">
          {heroCopy.heading}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          {heroCopy.subtitle}
        </p>
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-8 md:gap-14 scale-90 md:scale-100">
        <div className="flex flex-col items-center gap-2" data-tour-id={TOUR_TARGETS.matchOrb}>
          <MatchOrb
            isSearching={isSearching}
            onToggle={() => {
              if (!isSearching) onRequestMatch();
            }}
            disabled={isProposed}
          />
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {DASHBOARD_HERO.matchLabel}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2" data-tour-id={TOUR_TARGETS.circleOrb}>
          <CircleOrb isLoading={isOpen && categoriesLoading} onClick={openModal} />
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {DASHBOARD_HERO.circleLabel}
          </span>
        </div>
      </div>

      {isSearching && (
        <button
          type="button"
          onClick={onCancel}
          className="relative z-10 -mt-3 inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-border bg-muted/55 px-4 py-2 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-muted hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <X className="size-3.5 shrink-0 opacity-70" strokeWidth={2.5} aria-hidden />
          {DASHBOARD_HERO.cancelSearch}
        </button>
      )}

      {appState === "error" && error && (
        <p className="relative z-10 -mt-2 text-xs text-destructive text-center max-w-sm">{error}</p>
      )}

      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground md:gap-5">
          <span className="flex items-center gap-1.5">
            <Video size={12} className="text-primary" />
            <span>
              {insightsLoading ? (
                <span className="inline-block h-3 w-4 animate-pulse rounded bg-muted" />
              ) : (
                <strong className="text-foreground">{heroStats.matchCount}</strong>
              )}{" "}
              {DASHBOARD_HERO.stats.matches(heroStats.matchCount)}
            </span>
          </span>
          <span className="hidden h-3 w-px bg-border sm:block" />
          <span className="flex items-center gap-1.5">
            <Zap size={12} className="text-primary" />
            <span>
              Profile{" "}
              {insightsLoading ? (
                <span className="inline-block h-3 w-6 animate-pulse rounded bg-muted" />
              ) : heroStats.profileCompletion != null ? (
                <strong className="text-foreground">{heroStats.profileCompletion}%</strong>
              ) : (
                <strong className="text-foreground">-</strong>
              )}{" "}
              {DASHBOARD_HERO.stats.profileComplete}
            </span>
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground/75 text-center max-w-md leading-relaxed">
          {EARLY_RELEASE.noticeShort}
        </p>
        <p className="text-[11px] text-muted-foreground/60">{DASHBOARD_HERO.aiCuesComingSoon}</p>
      </div>
    </div>
  );
}

export const HeroSection = memo(HeroSectionInner);
