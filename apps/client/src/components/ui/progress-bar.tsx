import { cn } from "@/lib/utils";

type ProgressBarProps = {
  value: number;
  max?: number;
  className?: string;
  "aria-label"?: string;
};

/** Native `<progress>` styled with Tailwind — no inline width styles. */
export function ProgressBar({
  value,
  max = 100,
  className,
  "aria-label": ariaLabel,
}: ProgressBarProps) {
  const clamped = Math.min(max, Math.max(0, value));

  return (
    <progress
      value={clamped}
      max={max}
      aria-label={ariaLabel}
      className={cn(
        "block h-full w-full overflow-hidden rounded-full appearance-none border-0",
        "[&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-muted",
        "[&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary [&::-webkit-progress-value]:transition-all [&::-webkit-progress-value]:duration-300 [&::-webkit-progress-value]:ease-out",
        "[&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-primary",
        className,
      )}
    />
  );
}
