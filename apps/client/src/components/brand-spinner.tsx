import { cn } from "@/lib/utils";

type BrandSpinnerProps = {
  className?: string;
  /** Outer ring size. Default matches the try-flow loader. */
  size?: "sm" | "md" | "lg";
  label?: string;
};

const SIZE = {
  sm: { ring: "h-8 w-8 border-2", mark: "text-[10px]" },
  md: { ring: "h-12 w-12 border-[3px]", mark: "text-xs" },
  lg: { ring: "h-14 w-14 border-[3px]", mark: "text-sm" },
} as const;

/** Branded ring spinner with the Greetup mark — same look as the /try boot loader. */
export function BrandSpinner({
  className,
  size = "md",
  label = "Loading",
}: BrandSpinnerProps) {
  const s = SIZE[size];

  return (
    <div
      className={cn("relative", className)}
      role="status"
      aria-label={label}
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={cn(
          "animate-spin rounded-full border-primary/20 border-t-primary",
          s.ring,
        )}
        aria-hidden
      />
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
        <span className={cn("font-bold text-primary", s.mark)}>G</span>
      </div>
    </div>
  );
}
