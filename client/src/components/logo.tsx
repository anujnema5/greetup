import { cn } from "@/lib/utils";

export const Logo = ({
  className,
}: {
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "flex items-center gap-3 font-bold tracking-tight",
        className
      )}
    >
      <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
        <span className="text-lg font-extrabold">VR</span>
      </div>

      <span className="text-2xl font-bold bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
        Circlo
      </span>
    </div>
  );
};