"use client";

import { memo } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DASHBOARD_GREETING_SUBTITLE, DASHBOARD_HERO, DASHBOARD_SECTIONS } from "@/lib/copy/user-messages";
import { TOUR_TARGETS } from "@/features/tour-guide";
import { useStartSpaceModal } from "@/features/spaces";
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
  const { openModal, categoriesLoading, isOpen } = useStartSpaceModal();
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
      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-7 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-3.5">
          <HeroOnlinePeopleBadge />

          <div>
            <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-foreground sm:text-[1.75rem]">
              {heading}
            </h1>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
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
          </div>
        </div>

        <div className="flex w-full flex-col gap-2.5 lg:pt-1">
          <HeroActionCards
            isSearching={isSearching}
            matchDisabled={isProposed}
            spaceLoading={isOpen && categoriesLoading}
            onFindMatch={() => {
              if (!isSearching) onRequestMatch();
            }}
            onStartSpace={openModal}
          />

          {!isSearching && !isProposed ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2 rounded-2xl border-border/70 bg-card py-5 text-sm font-medium"
              data-tour-id={TOUR_TARGETS.changePreferences}
              onClick={onChangePreferences}
            >
              <SlidersHorizontal className="size-4 shrink-0 opacity-80" aria-hidden />
              {DASHBOARD_SECTIONS.changePreferences}
            </Button>
          ) : null}

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
