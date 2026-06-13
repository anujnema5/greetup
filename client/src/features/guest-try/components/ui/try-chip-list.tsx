"use client";

import type { MatchPrepOptionRow } from "@/features/profile-setup/types/profile-setup-api.types";
import { cn } from "@/lib/utils";

type TryChipListProps = {
  rows: MatchPrepOptionRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
};

export function TryChipList({ rows, selected, onToggle }: TryChipListProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {rows.map((row) => {
        const isSelected = selected.has(row.id);

        return (
          <button
            key={row.id}
            type="button"
            onClick={() => onToggle(row.id)}
            aria-pressed={isSelected}
            title={row.description ?? undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-all sm:text-[13px]",
              isSelected
                ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "border-white/10 bg-white/4 text-foreground hover:border-white/20 hover:bg-white/8",
            )}
          >
            {row.displayName}
          </button>
        );
      })}
    </div>
  );
}
