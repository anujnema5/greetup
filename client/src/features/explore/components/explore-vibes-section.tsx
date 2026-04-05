import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type ExploreVibeItem = {
  icon: LucideIcon;
  label: string;
  count: number;
  color: string;
};

type Props = {
  vibes: readonly ExploreVibeItem[];
};

export function ExploreVibesSection({ vibes }: Props) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-foreground mb-3">Browse by Vibe</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {vibes.map(({ icon: Icon, label, count, color }) => (
          <button
            key={label}
            type="button"
            className={cn(
              "group relative flex items-center gap-3 rounded-2xl bg-linear-to-br p-4 text-left overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02]",
              color,
            )}
          >
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
            <Icon size={20} className="relative z-10 text-white shrink-0" />
            <div className="relative z-10 min-w-0">
              <p className="text-sm font-semibold text-white leading-none">{label}</p>
              <p className="text-[11px] text-white/70 mt-1">{count} people</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
