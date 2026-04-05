import { memo } from "react";
import { Video, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const ORB_SIZE = 148;
const BTN_SIZE = 90;

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
    <div
      className="relative flex items-center justify-center"
      style={{ width: ORB_SIZE, height: ORB_SIZE }}
    >
      <div
        className={cn(
          "absolute rounded-full border border-primary/5 transition-opacity duration-500",
          isSearching && "match-orb-ring-pulse"
        )}
        style={{ inset: 0 }}
      />
      <div
        className={cn(
          "absolute rounded-full border border-primary/8 transition-opacity duration-500",
          isSearching && "match-orb-ring-pulse"
        )}
        style={{ inset: 16, animationDelay: isSearching ? "200ms" : undefined }}
      />
      <div
        className={cn(
          "absolute rounded-full border border-primary/12 transition-opacity duration-500",
          isSearching && "match-orb-ring-pulse"
        )}
        style={{ inset: 29, animationDelay: isSearching ? "400ms" : undefined }}
      />

      <div
        className={cn("absolute rounded-full blur-xl transition-opacity duration-500", isSearching ? "opacity-35" : "opacity-20")}
        style={{ inset: 29, background: "var(--color-primary)" }}
      />

      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          "relative z-10 flex flex-col items-center justify-center gap-2 rounded-full text-primary-foreground font-semibold transition-all duration-500 hover:scale-100",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          !isSearching && !disabled && "hover:brightness-105",
          isSearching && "animate-match-orb-breathe"
        )}
        style={{
          width: BTN_SIZE,
          height: BTN_SIZE,
          willChange: "transform",
          background: isSearching
            ? "radial-gradient(circle at 40% 35%, oklch(92% 0.13 105), oklch(80% 0.12 105))"
            : "radial-gradient(circle at 40% 35%, oklch(90% 0.11 105), oklch(78% 0.10 105))",
          boxShadow: isSearching
            ? "0 0 28px oklch(88% 0.11 105 / 0.35), 0 0 55px oklch(88% 0.11 105 / 0.12), inset 0 1px 0 oklch(96% 0.08 105 / 0.3)"
            : "0 0 18px oklch(88% 0.11 105 / 0.2), 0 8px 20px oklch(88% 0.11 105 / 0.15), inset 0 1px 0 oklch(96% 0.08 105 / 0.3)",
        }}
      >
        <div className="absolute inset-0 rounded-full bg-linear-to-b from-white/15 to-transparent" />
        <div className="relative flex flex-col items-center gap-1.5">
          {isSearching ? (
            <>
              <Zap size={19} fill="currentColor" className="animate-pulse" />
              <span className="text-[11px] font-bold tracking-wide">searching…</span>
            </>
          ) : (
            <>
              <Video size={19} strokeWidth={2} />
              <span className="text-[11px] font-bold tracking-wide">Find Match</span>
            </>
          )}
        </div>
      </button>
    </div>
  );
}

export const MatchOrb = memo(MatchOrbInner);
