"use client";

import { memo } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DASHBOARD_GREETING_SUBTITLE, DASHBOARD_HERO, DASHBOARD_SECTIONS } from "@/lib/copy/user-messages";
import { TOUR_TARGETS } from "@/features/tour-guide";
import { useStartCircleModal } from "@/features/circles";
import { useDashboardGreeting } from "../hooks/use-dashboard-greeting";
import { useDashboardInsights } from "../hooks/use-dashboard-insights";
import { HeroActionCards } from "./hero-action-cards";
import { HeroOnlinePeopleBadge } from "./hero-online-people-badge";

function HeroSectionInner({
  appState,
  onRequestMatch,
  onCancel,
  onChangePreferences,
  error,
}: {
  appState: "idle" | "searching" | "proposed" | "matched" | "error";
  onRequestMatch: () => void;
  onCancel: () => void;
  onChangePreferences: () => void;
  error?: string | null;
}) {
  const { openModal, categoriesLoading, isOpen } = useStartCircleModal();
  const { title } = useDashboardGreeting();
  const { heroStats, isLoading: insightsLoading } = useDashboardInsights();
  const isSearching = appState === "searching";
  const isProposed = appState === "proposed";

  const heroCopy = isSearching
    ? DASHBOARD_HERO.searching
    : isProposed
      ? DASHBOARD_HERO.proposed
      : null;

  const heading = heroCopy?.heading ?? title;
  const subtitle = heroCopy?.subtitle ?? DASHBOARD_GREETING_SUBTITLE;

  return (
    <section className="rounded-2xl border border-border bg-hero-card-surface">
      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-3.5">
          <HeroOnlinePeopleBadge />

          <div>
            <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-foreground sm:text-[1.75rem]">
              {heading}
            </h1>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              {insightsLoading ? (
                <span className="inline-block h-3.5 w-10 animate-pulse rounded bg-muted" />
              ) : (
                <>
                  <strong className="font-semibold text-foreground">{heroStats.matchCount}</strong>
                  {DASHBOARD_HERO.stats.matches(heroStats.matchCount)}
                </>
              )}
            </span>

            <span className="hidden h-3 w-px bg-border sm:block" aria-hidden />

            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              data-tour-id={TOUR_TARGETS.changePreferences}
              onClick={onChangePreferences}
            >
              <SlidersHorizontal className="size-3.5 opacity-70" aria-hidden />
              {DASHBOARD_SECTIONS.changePreferences}
            </button>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2.5 lg:pt-1">
          <HeroActionCards
            isSearching={isSearching}
            matchDisabled={isProposed}
            circleLoading={isOpen && categoriesLoading}
            onFindMatch={() => {
              if (!isSearching) onRequestMatch();
            }}
            onStartCircle={openModal}
          />

          {isSearching ? (
            <Button type="button" variant="ghost" size="sm" className="self-center rounded-full" onClick={onCancel}>
              <X className="size-3.5 opacity-70" aria-hidden />
              {DASHBOARD_HERO.cancelSearch}
            </Button>
          ) : null}

          {appState === "error" && error ? (
            <p className="text-center text-xs text-destructive">{error}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export const HeroSection = memo(HeroSectionInner);
