"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode, RefObject } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MatchPrepOptionRow, MatchPrepActivityOptionRow } from "@/features/profile-setup/types/profile-setup-api.types";
import { cn } from "@/lib/utils";
import type {
  ConnectionPreferenceValue,
  DistancePreferenceValue,
  MatchIntentValue,
} from "../types/match-prep.types";

const CONNECTION_OPTIONS: { id: ConnectionPreferenceValue; label: string }[] = [
  { id: "same_profession", label: "People in my profession" },
  { id: "different_profession", label: "People from other professions" },
  { id: "open_to_anyone", label: "Open to anyone" },
];

const DISTANCE_OPTIONS: { id: DistancePreferenceValue; label: string }[] = [
  { id: "random", label: "Random" },
  { id: "same_city", label: "Same city" },
  { id: "same_country", label: "Same country" },
  { id: "global", label: "Global" },
];

export function MatchPrepSectionLabel({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <Label htmlFor={htmlFor} className="text-muted-foreground">
      {children}
    </Label>
  );
}

function chipClass(selected: boolean): string {
  return cn(
    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
    selected
      ? "border-primary bg-primary text-primary-foreground shadow-sm"
      : "border-border bg-muted/40 text-foreground hover:bg-muted/70",
  );
}

function isSelected(selected: Set<string> | string[], id: string): boolean {
  return selected instanceof Set ? selected.has(id) : selected.includes(id);
}

export function OptionChipList({
  rows,
  selected,
  selectedIds,
  onToggle,
}: {
  rows: MatchPrepOptionRow[];
  selected?: Set<string>;
  selectedIds?: string[];
  onToggle: (id: string) => void;
}) {
  const selection = selectedIds ?? selected ?? [];
  return (
    <div className="flex flex-wrap gap-2">
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          onClick={() => onToggle(row.id)}
          title={row.description ?? undefined}
          className={chipClass(isSelected(selection, row.id))}
        >
          {row.displayName}
        </button>
      ))}
    </div>
  );
}

export function ConnectionPreferenceRow({
  value,
  onChange,
}: {
  value: ConnectionPreferenceValue;
  onChange: (next: ConnectionPreferenceValue) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 py-1">
      {CONNECTION_OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={chipClass(value === o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function DistancePreferenceRow({
  value,
  onChange,
}: {
  value: DistancePreferenceValue;
  onChange: (next: DistancePreferenceValue) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 py-1">
      {DISTANCE_OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={chipClass(value === o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function MatchIntentRow({
  value,
  onChange,
}: {
  value: MatchIntentValue;
  onChange: (next: MatchIntentValue) => void;
}) {
  const options: { id: MatchIntentValue; label: string; hint: string }[] = [
    { id: "quick", label: "Quick match", hint: "Find anyone" },
    { id: "activity", label: "Match by activity", hint: "Same activity" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 py-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-xl border px-3 py-2.5 text-left transition-colors",
            value === o.id
              ? "border-primary bg-primary/10"
              : "border-border bg-muted/30 hover:bg-muted/50",
          )}
        >
          <span className="block text-xs font-semibold text-foreground">{o.label}</span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">{o.hint}</span>
        </button>
      ))}
    </div>
  );
}

function activityShowsDetailField(row: MatchPrepActivityOptionRow): boolean {
  return row.detailMode !== "none";
}

export function SessionActivitiesBlock({
  rows,
  selectedIds,
  activityDetails,
  onToggle,
  onDetailChange,
  required,
}: {
  rows: MatchPrepActivityOptionRow[];
  selectedIds: Set<string>;
  activityDetails: Record<string, string>;
  onToggle: (id: string) => void;
  onDetailChange: (id: string, value: string) => void;
  required: boolean;
}) {
  return (
    <section className="flex flex-col gap-2.5 py-1">
      <MatchPrepSectionLabel>
        What do you want to do?
        {required ? " (required)" : " (optional)"}
      </MatchPrepSectionLabel>
      <div className="flex flex-wrap gap-2">
        {rows.map((row) => {
          const selected = selectedIds.has(row.id);
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => onToggle(row.id)}
              title={row.description ?? undefined}
              className={chipClass(selected)}
            >
              {row.emoji ? `${row.emoji} ` : ""}
              {row.displayName}
            </button>
          );
        })}
      </div>
      {rows
        .filter((row) => selectedIds.has(row.id) && activityShowsDetailField(row))
        .map((row) => {
          const label = row.detailLabel ?? "Details";
          const showOptionalSuffix =
            !row.detailRequired && !/\(optional\)/i.test(label);

          return (
          <div key={`detail-${row.id}`} className="flex flex-col gap-2.5 pt-1">
            <Label htmlFor={`activity-detail-${row.id}`} className="text-muted-foreground">
              {label}
              {showOptionalSuffix ? " (optional)" : ""}
            </Label>
            <Input
              id={`activity-detail-${row.id}`}
              type="text"
              value={activityDetails[row.id] ?? ""}
              maxLength={row.detailMaxLength}
              placeholder={
                row.detailPlaceholder ??
                (row.detailMode === "language" ? "e.g. Spanish" : "Add a short title")
              }
              onChange={(e) => onDetailChange(row.id, e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>
          );
        })}
    </section>
  );
}

export function InterestsBlock({
  sectionRef,
  open,
  onToggleOpen,
  rows,
  selected,
  selectedIds,
  onToggleOption,
}: {
  sectionRef: RefObject<HTMLDivElement | null>;
  open: boolean;
  onToggleOpen: () => void;
  rows: MatchPrepOptionRow[];
  selected?: Set<string>;
  selectedIds?: string[];
  onToggleOption: (id: string) => void;
}) {
  return (
    <div
      ref={sectionRef}
      className="space-y-3 scroll-mt-4"
    >
      <div className="flex justify-start">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleOpen}
          className="gap-1.5 rounded-full"
        >
          Select interests
          <ChevronDown
            aria-hidden
            className={cn(
              "size-3.5 opacity-70 transition-transform",
              open && "rotate-180",
            )}
          />
        </Button>
      </div>
      {open && (
        <div className="space-y-2 rounded-xl bg-muted/10 py-1">
          <OptionChipList
            rows={rows}
            selected={selected}
            selectedIds={selectedIds}
            onToggle={onToggleOption}
          />
        </div>
      )}
    </div>
  );
}
