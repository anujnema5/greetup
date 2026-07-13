import { cn } from "@/lib/utils";

type ActivityChip = { emoji: string; label: string };

type LandingActivityChipsProps = {
  items: ReadonlyArray<ActivityChip>;
  className?: string;
  size?: "sm" | "md";
};

export function LandingActivityChips({
  items,
  className,
  size = "md",
}: LandingActivityChipsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {items.map(({ emoji, label }) => (
        <span
          key={label}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors",
            size === "sm"
              ? "border-border bg-muted/50 px-2.5 py-1 text-[11px] sm:text-xs landing-muted"
              : "border-[oklch(88%_0.18_105/0.25)] bg-[oklch(88%_0.18_105/0.07)] px-3 py-1.5 text-xs landing-muted",
          )}
        >
          <span aria-hidden>{emoji}</span>
          {label}
        </span>
      ))}
    </div>
  );
}
