import { Zap } from "lucide-react";

import { cn } from "@/lib/utils";

type DemoPerson = {
  name: string;
  tagline: string;
  initials: string;
  grad: string;
  online?: boolean;
  vibeScore: number;
};

type Props = {
  people: readonly DemoPerson[];
};

export function ExploreDemoPeopleList({ people }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {people.map((p) => (
        <div
          key={p.name}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 opacity-90"
        >
          <div className="relative shrink-0">
            <div
              className={cn(
                "h-10 w-10 rounded-full bg-linear-to-br flex items-center justify-center text-sm font-bold text-white",
                p.grad,
              )}
            >
              {p.initials}
            </div>
            {p.online && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-card" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{p.name}</p>
            <p className="text-xs text-muted-foreground truncate">{p.tagline}</p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Zap size={11} className="text-primary" aria-hidden />
            <span className="text-xs font-semibold text-primary">{p.vibeScore}%</span>
          </div>

          <button
            type="button"
            disabled
            className="shrink-0 flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary/70 cursor-not-allowed"
          >
            <Zap size={11} aria-hidden />
            Demo
          </button>
        </div>
      ))}
    </div>
  );
}
