"use client";

import type { RefObject } from "react";
import { useFormContext } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { MatchPrepOptionsData } from "@/features/profile-setup/types/profile-setup-api.types";
import type { MatchPrepActivityOptionRow } from "@/features/profile-setup/types/profile-setup-api.types";
import type { ResolvedLocationSuggestionData } from "@/features/profile-setup/types/profile-setup-api.types";
import { cn } from "@/lib/utils";

import type { MatchPrepFormValues } from "../schemas/match-prep-form.schema";
import type { MatchPrepLocation } from "../types/match-prep.types";
import { toggleIdInArray } from "../utils/match-prep-dialog.utils";
import { MatchPrepLocationSection } from "./match-prep-location-section";
import {
  ConnectionPreferenceRow,
  InterestsBlock,
  MatchIntentRow,
  MatchPrepSectionLabel,
  OptionChipList,
} from "./match-prep-dialog-parts";

const MAX_SESSION_ACTIVITIES = 3;

function activityShowsDetailField(row: MatchPrepActivityOptionRow): boolean {
  return row.detailMode !== "none";
}

type MatchPrepFormBodyProps = {
  data: MatchPrepOptionsData;
  interestsSectionRef: RefObject<HTMLDivElement | null>;
  interestsOpen: boolean;
  onInterestsOpenChange: (open: boolean) => void;
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

export function MatchPrepFormBody({
  data,
  interestsSectionRef,
  interestsOpen,
  onInterestsOpenChange,
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
}: MatchPrepFormBodyProps) {
  const form = useFormContext<MatchPrepFormValues>();
  const matchIntent = form.watch("matchIntent");

  return (
    <div className="space-y-5 pt-1">
      <FormField
        control={form.control}
        name="matchIntent"
        render={({ field }) => (
          <FormItem className="gap-2.5 py-1">
            <FormLabel className="text-muted-foreground">How do you want to match?</FormLabel>
            <FormControl>
              <MatchIntentRow value={field.value} onChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {(data.activities?.length ?? 0) > 0 && (
        <FormField
          control={form.control}
          name="activityIds"
          render={({ field }) => (
            <FormItem className="gap-2.5 py-1">
              <MatchPrepSectionLabel>
                What do you want to do?
                {matchIntent === "activity" ? " (required)" : " (optional)"}
              </MatchPrepSectionLabel>
              <FormControl>
                <div className="flex flex-wrap gap-2">
                  {data.activities.map((row) => {
                    const selected = field.value.includes(row.id);
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => {
                          const next = toggleIdInArray(row.id, field.value, MAX_SESSION_ACTIVITIES);
                          field.onChange(next);
                          if (!next.includes(row.id)) {
                            const details = { ...form.getValues("activityDetails") };
                            delete details[row.id];
                            form.setValue("activityDetails", details, { shouldDirty: true });
                          }
                        }}
                        title={row.description ?? undefined}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                          selected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-muted/40 text-foreground hover:bg-muted/70",
                        )}
                      >
                        {row.emoji ? `${row.emoji} ` : ""}
                        {row.displayName}
                      </button>
                    );
                  })}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {data.activities
        .filter(
          (row) =>
            form.watch("activityIds").includes(row.id) && activityShowsDetailField(row),
        )
        .map((row) => {
          const label = row.detailLabel ?? "Details";
          const showOptionalSuffix =
            !row.detailRequired && !/\(optional\)/i.test(label);

          return (
            <FormField
              key={`detail-${row.id}`}
              control={form.control}
              name={`activityDetails.${row.id}`}
              render={({ field }) => (
                <FormItem className="gap-2.5 pt-1">
                  <FormLabel className="text-muted-foreground">
                    {label}
                    {showOptionalSuffix ? " (optional)" : ""}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      maxLength={row.detailMaxLength}
                      placeholder={
                        row.detailPlaceholder ??
                        (row.detailMode === "language" ? "e.g. Spanish" : "Add a short title")
                      }
                      className="h-10 rounded-xl"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        })}

      <FormField
        control={form.control}
        name="moodIds"
        render={({ field }) => (
          <FormItem className="gap-2.5 py-1">
            <FormLabel className="text-muted-foreground">Mood right now</FormLabel>
            <FormControl>
              <OptionChipList
                rows={data.moods}
                selectedIds={field.value}
                onToggle={(id) => field.onChange(toggleIdInArray(id, field.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="lookingForIds"
        render={({ field }) => (
          <FormItem className="gap-2.5 py-1">
            <FormLabel className="text-muted-foreground">Looking for</FormLabel>
            <FormControl>
              <OptionChipList
                rows={data.lookingFor}
                selectedIds={field.value}
                onToggle={(id) => field.onChange(toggleIdInArray(id, field.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="connectionPreference"
        render={({ field }) => (
          <FormItem className="gap-2.5">
            <FormLabel className="text-muted-foreground">Who should we prioritize?</FormLabel>
            <FormControl>
              <ConnectionPreferenceRow value={field.value} onChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="locationPreferenceEnabled"
        render={({ field: enabledField }) => (
          <FormField
            control={form.control}
            name="distancePreference"
            render={({ field: distanceField }) => (
              <FormField
                control={form.control}
                name="location"
                render={() => (
                  <FormItem>
                    <FormControl>
                      <MatchPrepLocationSection
                        locationPreferenceEnabled={enabledField.value}
                        onLocationPreferenceEnabledChange={enabledField.onChange}
                        distancePreference={distanceField.value}
                        onDistancePreferenceChange={distanceField.onChange}
                        selectedLocation={selectedLocation}
                        manualLocationText={manualLocationText}
                        onManualLocationTextChange={onManualLocationTextChange}
                        onManualLocationTextFocus={onManualLocationTextFocus}
                        locationSuggestions={locationSuggestions}
                        isFetchingSuggestions={isFetchingSuggestions}
                        suggestionsOpen={suggestionsOpen}
                        onSelectLocationSuggestion={onSelectLocationSuggestion}
                        onUseCurrentLocation={onUseCurrentLocation}
                        onUseTypedLocation={onUseTypedLocation}
                        busy={busy}
                        isLocatingCurrent={isLocatingCurrent}
                        isResolvingManualLocation={isResolvingManualLocation}
                        locationError={locationError}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          />
        )}
      />

      <FormField
        control={form.control}
        name="interestIds"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <InterestsBlock
                sectionRef={interestsSectionRef}
                open={interestsOpen}
                onToggleOpen={() => onInterestsOpenChange(!interestsOpen)}
                rows={data.interests}
                selectedIds={field.value}
                onToggleOption={(id) => field.onChange(toggleIdInArray(id, field.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
