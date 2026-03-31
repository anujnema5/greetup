import { memo } from "react";
import { Video, Zap, Sparkles, X } from "lucide-react";
import { MatchOrb } from "./match-orb";

function HeroSectionInner({
  appState,
  onToggle,
  onCancel,
  error,
}: {
  appState: "idle" | "searching" | "matched" | "error";
  onToggle: () => void;
  onCancel: () => void;
  error?: string | null;
}) {
  const isSearching = appState === "searching";

  const headingText =
    appState === "searching" ? "finding your people rn…" : "your vibe finds\nyour tribe.";

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-border flex flex-col items-center justify-center gap-4 py-6 px-4 md:gap-5 md:py-8 md:px-8 bg-card"
      style={{
        background: `
          radial-gradient(ellipse 70% 50% at 50% 0%, var(--surface-hero-glow) 0%, transparent 72%),
          radial-gradient(ellipse 50% 40% at 85% 85%, var(--surface-hero-glow-2) 0%, transparent 60%),
          var(--surface-hero-base)
        `,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, var(--surface-dot-grid) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 rounded-full blur-[100px] opacity-40"
        style={{ width: 480, height: 280, background: "oklch(88% 0.11 105 / 0.15)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-16 -right-16 rounded-full blur-[80px] opacity-25"
        style={{ width: 280, height: 280, background: "oklch(60% 0.2 280 / 0.1)" }}
      />

      <div className="relative z-10 flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2 backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse dark:bg-emerald-400" />
        <span className="text-xs text-muted-foreground">
          <span className="text-foreground font-semibold">1,240</span> people online
        </span>
      </div>

      <div className="relative z-10 text-center">
        <h2
          className="text-[1.8rem] md:text-[2.4rem] font-bold tracking-tight leading-[1.5] text-transparent bg-clip-text bg-gradient-to-br from-foreground via-primary to-primary/80 dark:from-white dark:via-primary dark:to-primary/90"
        >
          {headingText}
        </h2>
        <p className="mt-3 text-xs md:text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
          mood check → match made. network, vibe, or just talk to someone who gets it.
        </p>
      </div>

      <div className="relative z-10 scale-90 md:scale-100">
        <MatchOrb isSearching={isSearching} onToggle={onToggle} />
      </div>

      {isSearching && (
        <button
          type="button"
          onClick={onCancel}
          className="relative z-10 -mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-muted/55 px-4 py-2 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-muted hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card cursor-pointer"
        >
          <X className="size-3.5 shrink-0 opacity-70" strokeWidth={2.5} aria-hidden />
          Cancel
        </button>
      )}

      {appState === "error" && error && (
        <p className="relative z-10 -mt-2 text-xs text-destructive text-center max-w-xs">{error}</p>
      )}

      <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 md:gap-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Video size={12} className="text-primary" />
          <span>
            <strong className="text-foreground">3</strong> matches today
          </span>
        </span>
        <span className="h-3 w-px bg-border hidden sm:block" />
        <span className="flex items-center gap-1.5">
          <Zap size={12} className="text-primary" />
          <span>
            Vibe score <strong className="text-foreground">87</strong>
          </span>
        </span>
        <span className="h-3 w-px bg-border hidden sm:block" />
        <span className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-primary" />
          <span>
            <strong className="text-foreground">8</strong> great matches waiting
          </span>
        </span>
      </div>
    </div>
  );
}

export const HeroSection = memo(HeroSectionInner);
