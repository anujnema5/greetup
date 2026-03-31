import { memo } from "react";
import { Plus, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { CIRCLES, CONNECTIONS, TRENDING_TAGS } from "../constants/mock-data";

function RightPanelInner() {
  return (
    <aside className="hidden lg:flex flex-col gap-5 w-72 min-h-screen border-l border-border bg-card py-5 px-4">
      <button
        type="button"
        className="flex items-center justify-center gap-2 w-full rounded-lg border border-dashed border-border bg-muted/40 px-4 py-2 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all duration-200 cursor-pointer"
      >
        <Plus size={15} />
        Start a Circle
      </button>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Now</h3>
          <button type="button" className="text-xs text-primary hover:underline cursor-pointer">
            See all
          </button>
        </div>
        <div className="flex flex-col gap-0.5">
          {CIRCLES.slice(0, 4).map((c) => (
            <button
              key={c.id}
              type="button"
              className="flex items-center justify-between w-full rounded-lg px-3 py-2.5 hover:bg-muted transition-colors duration-150 text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0 animate-pulse" />
                <span className="font-medium text-foreground truncate text-xs">{c.topic}</span>
              </div>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0 ml-2">
                <Users size={10} />
                {c.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-border" />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Connections</h3>
        </div>
        <div className="flex flex-col gap-1">
          {CONNECTIONS.map((conn) => (
            <div
              key={conn.id}
              className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-muted cursor-pointer transition-colors duration-150"
            >
              <div className="relative shrink-0">
                <div
                  className={cn(
                    "h-9 w-9 rounded-full bg-linear-to-br flex items-center justify-center text-xs font-bold text-white",
                    conn.grad
                  )}
                >
                  {conn.initials}
                </div>
                {conn.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-card" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">{conn.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{conn.sub}</p>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-primary shrink-0">
                <Sparkles size={10} />
                {conn.mutual}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-border" />

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Trending Vibes</h3>
        <div className="flex flex-wrap gap-1.5">
          {TRENDING_TAGS.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary cursor-pointer transition-colors duration-150"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-auto rounded-2xl bg-primary/8 border border-primary/15 px-4 py-3.5">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles size={13} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">High match quality today</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          We found <span className="text-primary font-semibold">8 people</span> with strong alignment. Hit Find Match to connect.
        </p>
      </div>
    </aside>
  );
}

export const RightPanel = memo(RightPanelInner);
