import { memo } from "react";
import { Video, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

function MatchOrbInner({
  isSearching,
  onToggle,
  disabled,
}: {
  isSearching: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="match-orb-shell">
      <div aria-hidden="true">
        <div
          className={cn(
            "match-orb-ring-outer",
            isSearching && "match-orb-ring-pulse",
          )}
        />
        <div
          className={cn(
            "match-orb-ring-mid",
            isSearching && "match-orb-ring-pulse delay-200",
          )}
        />
        <div
          className={cn(
            "match-orb-ring-inner",
            isSearching && "match-orb-ring-pulse delay-[400ms]",
          )}
        />
        <div
          className={cn(
            "match-orb-glow",
            isSearching && "match-orb-glow-searching",
          )}
        />
      </div>

      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label={isSearching ? "Searching for a match" : "Find a match"}
        aria-busy={isSearching}
        className={cn(
          "match-orb-btn",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          !isSearching && !disabled && "hover:brightness-105",
          isSearching && "match-orb-btn-searching animate-match-orb-breathe",
        )}
      >
        <div className="absolute inset-0 rounded-full bg-linear-to-b from-white/15 to-transparent" aria-hidden />
        <div className="relative flex flex-col items-center gap-1.5">
          {isSearching ? (
            <>
              <Zap size={19} fill="currentColor" className="animate-pulse" aria-hidden />
              <span className="text-[11px] font-bold tracking-wide" aria-hidden>
                searching…
              </span>
            </>
          ) : (
            <>
              <Video size={19} strokeWidth={2} aria-hidden />
              <span className="text-[11px] font-bold tracking-wide" aria-hidden>
                Find Match
              </span>
            </>
          )}
        </div>
      </button>
    </div>
  );
}

export const MatchOrb = memo(MatchOrbInner);
