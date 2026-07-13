import { cn } from "@/lib/utils";

export const Logo = ({
  className,
}: {
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "flex items-center gap-2 sm:gap-3 font-semibold sm:font-bold tracking-tight",
        className
      )}
    >
      <div className="relative flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-md sm:shadow-lg shadow-primary/25">
        <span className="text-base sm:text-lg font-bold sm:font-black leading-none tracking-[-0.03em]" aria-hidden>
          G
        </span>
      </div>

      <span className="text-xl sm:text-2xl font-semibold sm:font-bold bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
        Greetup
      </span>
    </div>
  );
};