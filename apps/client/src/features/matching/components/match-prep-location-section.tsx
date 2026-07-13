"use client";

import { Loader2, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { DistancePreferenceRow } from "./match-prep-dialog-parts";
import type { DistancePreferenceValue } from "../types/match-prep.types";
import { getLocationLabel } from "../hooks/use-match-prep-location";
import type { MatchPrepLocation } from "../types/match-prep.types";
import type { ResolvedLocationSuggestionData } from "@/features/profile-setup/types/profile-setup-api.types";

function getSuggestionPrimaryText(suggestion: ResolvedLocationSuggestionData): string {
  const primary = suggestion.primaryText?.trim();
  if (primary) return primary;
  const [head] = suggestion.label.split(",");
  return head?.trim() || suggestion.label;
}

function getSuggestionSecondaryText(
  suggestion: ResolvedLocationSuggestionData,
): string | undefined {
  const secondary = suggestion.secondaryText?.trim();
  if (secondary) return secondary;
  const parts = suggestion.label.split(",");
  if (parts.length <= 1) return undefined;
  return parts.slice(1).join(",").trim() || undefined;
}

type MatchPrepLocationSectionProps = {
  locationPreferenceEnabled: boolean;
  onLocationPreferenceEnabledChange: (next: boolean) => void;
  distancePreference: DistancePreferenceValue;
  onDistancePreferenceChange: (next: DistancePreferenceValue) => void;
  selectedLocation: MatchPrepLocation | null;
  manualLocationText: string;
  onManualLocationTextChange: (value: string) => void;
  onManualLocationTextFocus: () => void;
  locationSuggestions: ResolvedLocationSuggestionData[];
  isFetchingSuggestions: boolean;
  suggestionsOpen: boolean;
  onSelectLocationSuggestion: (suggestion: ResolvedLocationSuggestionData) => void;
  onUseCurrentLocation: () => void;
  onUseTypedLocation: () => void;
  busy: boolean;
  isLocatingCurrent: boolean;
  isResolvingManualLocation: boolean;
  locationError: string | null;
};

export function MatchPrepLocationSection({
  locationPreferenceEnabled,
  onLocationPreferenceEnabledChange,
  distancePreference,
  onDistancePreferenceChange,
  selectedLocation,
  manualLocationText,
  onManualLocationTextChange,
  onManualLocationTextFocus,
  locationSuggestions,
  isFetchingSuggestions,
  suggestionsOpen,
  onSelectLocationSuggestion,
  onUseCurrentLocation,
  onUseTypedLocation,
  busy,
  isLocatingCurrent,
  isResolvingManualLocation,
  locationError,
}: MatchPrepLocationSectionProps) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-muted-foreground">Location-based search</Label>
        <Switch
          checked={locationPreferenceEnabled}
          onCheckedChange={onLocationPreferenceEnabledChange}
        />
      </div>

      {locationPreferenceEnabled && (
        <div className="space-y-3">
          <DistancePreferenceRow
            value={distancePreference}
            onChange={onDistancePreferenceChange}
          />

          <div className="px-0.5 py-1 text-xs text-muted-foreground">
            <div className="mb-1 flex items-center gap-1.5 text-foreground">
              <MapPin className="size-3.5 opacity-70" aria-hidden />
              Selected location
            </div>
            {getLocationLabel(selectedLocation)}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs font-medium"
              onClick={onUseCurrentLocation}
              disabled={busy || isLocatingCurrent || isResolvingManualLocation}
            >
              {isLocatingCurrent ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
                  Detecting...
                </span>
              ) : (
                "Use current location"
              )}
            </Button>
          </div>

          <div className="space-y-1">
            <div className="flex gap-2">
              <Input
                value={manualLocationText}
                onChange={(e) => onManualLocationTextChange(e.target.value)}
                onFocus={onManualLocationTextFocus}
                placeholder="Type city, state, or country"
                className="h-9 text-sm"
                disabled={busy || isLocatingCurrent || isResolvingManualLocation}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 min-w-14 shrink-0 rounded-md border-border/70 bg-muted/30 px-3 text-xs font-medium text-foreground hover:bg-muted/60"
                onClick={onUseTypedLocation}
                disabled={busy || isLocatingCurrent || isResolvingManualLocation}
              >
                {isResolvingManualLocation ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  "Use"
                )}
              </Button>
            </div>

            {suggestionsOpen && manualLocationText.trim().length >= 2 && (
              <div className="w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md">
                {isFetchingSuggestions ? (
                  <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden />
                    Searching locations...
                  </div>
                ) : locationSuggestions.length > 0 ? (
                  <div className="max-h-52 overflow-y-auto py-1">
                    {locationSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.placeId}
                        type="button"
                        onClick={() => onSelectLocationSuggestion(suggestion)}
                        className="group w-full px-3 py-2 text-left hover:bg-accent dark:hover:text-black"
                      >
                        {(() => {
                          const primaryText = getSuggestionPrimaryText(suggestion);
                          const secondaryText = getSuggestionSecondaryText(suggestion);
                          return (
                            <>
                              <div className="truncate text-xs font-medium text-foreground dark:group-hover:text-black">
                                {primaryText}
                              </div>
                              {secondaryText ? (
                                <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground dark:group-hover:text-black/75">
                                  {secondaryText}
                                </div>
                              ) : null}
                            </>
                          );
                        })()}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    No suggestions found.
                  </div>
                )}
              </div>
            )}
          </div>

          {locationError && (
            <p className="text-xs text-destructive" role="alert">
              {locationError}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
