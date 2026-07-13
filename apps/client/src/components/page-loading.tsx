import { cn } from "@/lib/utils";

import { BrandSpinner } from "./brand-spinner";

type PageLoadingProps = {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

/** Branded page loader, vertically centered in the viewport. */
export function PageLoading({
  message,
  className,
  size = "md",
}: PageLoadingProps) {
  return (
    <div
      className={cn(
        "flex min-h-dvh w-full flex-col items-center justify-center gap-4 bg-background",
        className,
      )}
    >
      <BrandSpinner size={size} label={message ?? "Loading"} />
      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}
