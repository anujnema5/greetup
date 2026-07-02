"use client";

import { Radio } from "lucide-react";

import { OPEN_TO_CONNECT } from "@/lib/copy/user-messages";

import { useOpenToConnectSearchSuggestions } from "../api/open-to-connect.queries";
import { usePendingOutboundByTargetUserId } from "../api/connect-requests.queries";
import { useDelayedTrue } from "../hooks/use-delayed-true";
import { OpenNowPersonCard, OpenNowPersonCardSkeleton } from "./open-now-person-card";

const SEARCH_SUGGESTIONS_DELAY_MS = 20_000;

type Props = {
  /** User is searching or just received a no-match offer. */
  active: boolean;
  /** Skip the long-search delay (e.g. right after no_match). */
  immediate?: boolean;
};

export function SearchOpenNowSuggestions({ active, immediate = false }: Props) {
  const delayReady = useDelayedTrue(active && !immediate, SEARCH_SUGGESTIONS_DELAY_MS);
  const queryEnabled = active && (immediate || delayReady);
  const { data, isLoading, isError } = useOpenToConnectSearchSuggestions(queryEnabled);
  const pendingByTarget = usePendingOutboundByTargetUserId();

  if (!queryEnabled) return null;

  const people = data?.items ?? [];
  const copy = OPEN_TO_CONNECT.searchFallback;

  return (
    <section
      className="rounded-2xl border border-border/70 bg-card/80 p-3.5"
      aria-live="polite"
    >
      <div className="mb-3 flex items-start gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
          <Radio className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{copy.title}</h2>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{copy.subtitle}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <OpenNowPersonCardSkeleton key={index} variant="compact" />
          ))}
        </div>
      ) : isError || people.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
          {copy.empty}
        </p>
      ) : (
        <div className="space-y-2">
          {people.map((person) => (
            <OpenNowPersonCard
              key={person.userId}
              person={person}
              variant="compact"
              showRequestAction
              pendingRequest={pendingByTarget.get(person.userId)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
