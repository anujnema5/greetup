"use client";

import { ChevronDown } from "lucide-react";
import type { RefObject } from "react";

import type {
  MatchPrepCurrentData,
  MatchPrepOptionRow,
} from "@/features/profile-setup/types/profile-setup-api.types";
import { cn } from "@/lib/utils";

export type ConnectionPreferenceValue = NonNullable<
  MatchPrepCurrentData["connectionPreference"]
>;

const CONNECTION_OPTIONS: { id: ConnectionPreferenceValue; label: string }[] = [
  { id: "same_profession", label: "People in my profession" },
  { id: "different_profession", label: "People from other professions" },
  { id: "open_to_anyone", label: "Open to anyone" },
];

function chipClass(selected: boolean): string {
  return cn(
    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
    selected
      ? "border-primary bg-primary text-primary-foreground shadow-sm"
      : "border-border bg-muted/40 text-foreground hover:bg-muted/70",
  );
}

export function OptionChipList({
  rows,
  selected,
  onToggle,
}: {
  rows: MatchPrepOptionRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          onClick={() => onToggle(row.id)}
          title={row.description ?? undefined}
          className={chipClass(selected.has(row.id))}
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

export function InterestsBlock({
  sectionRef,
  open,
  onToggleOpen,
  rows,
  selected,
  onToggleOption,
}: {
  sectionRef: RefObject<HTMLDivElement | null>;
  open: boolean;
  onToggleOpen: () => void;
  rows: MatchPrepOptionRow[];
  selected: Set<string>;
  onToggleOption: (id: string) => void;
}) {
  return (
    <div
      ref={sectionRef}
      className="space-y-3 scroll-mt-4 border-t border-border/50 pt-4"
    >
      <div className="flex justify-start">
        <button
          type="button"
          onClick={onToggleOpen}
          className="inline-flex cursor-pointer items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Select Interests
          <ChevronDown
            aria-hidden
            className={cn(
              "size-3.5 opacity-70 transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </div>
      {open && (
        <div className="space-y-2 rounded-xl bg-muted/10 py-1">
          <OptionChipList rows={rows} selected={selected} onToggle={onToggleOption} />
        </div>
      )}
    </div>
  );
}
