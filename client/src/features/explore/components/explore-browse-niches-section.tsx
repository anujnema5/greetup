"use client";

import { Loader2 } from "lucide-react";

import { EXPLORE } from "@/lib/copy/user-messages";
import { cn } from "@/lib/utils";

import { nicheCardGradient } from "../constants/niche-card-gradients";
import { formatNicheGroupCounts } from "../lib/browse-niche-display";
import type { BrowseNicheItem } from "../types/browse-niches.types";

type Props = {
  niches: readonly BrowseNicheItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onSelectNiche: (niche: BrowseNicheItem) => void;
};

export function ExploreBrowseNichesSection({
  niches,
  isLoading,
  isError,
  onRetry,
  onSelectNiche,
}: Props) {
  if (!isLoading && !isError && niches.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-foreground">{EXPLORE.browseNiches.title}</h2>
      <p className="text-xs text-muted-foreground mt-1 mb-3">{EXPLORE.browseNiches.subtitle}</p>

      {isLoading ? (
        <div className="flex h-24 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin shrink-0" aria-hidden />
          {EXPLORE.browseNiches.loading}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-3 text-sm">
          <p className="text-muted-foreground">{EXPLORE.browseNiches.error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {niches.map((niche, index) => (
            <button
              key={niche.id}
              type="button"
              onClick={() => onSelectNiche(niche)}
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl bg-linear-to-br p-4 text-left overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                nicheCardGradient(index),
              )}
            >
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              <span className="relative z-10 text-lg leading-none shrink-0" aria-hidden>
                {niche.emoji ?? "○"}
              </span>
              <div className="relative z-10 min-w-0">
                <p className="text-sm font-semibold text-white leading-tight truncate">
                  {niche.displayName}
                </p>
                <p className="text-[11px] text-white/70 mt-1 leading-snug">
                  {formatNicheGroupCounts(niche)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
