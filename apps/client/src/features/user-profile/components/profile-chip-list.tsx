import { cn } from "@/lib/utils";

type ProfileChipListProps = {
  items: string[];
};

export function ProfileChipList({ items }: ProfileChipListProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((label, index) => (
        <span
          key={`${label}-${index}`}
          className={cn(
            "rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium",
            "text-foreground/90 dark:border-primary/25 dark:bg-primary/10 dark:text-primary",
          )}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
