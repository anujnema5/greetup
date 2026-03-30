"use client";

import { Search, Sparkles, Zap } from "lucide-react";
import { NavSidebar, BottomNav } from "@/features/app-shell";
import { cn } from "@/lib/utils";
import { VIBES, PEOPLE } from "../constants/mock-data";
import { useExploreSearch } from "../hooks/use-explore-search";

export function ExplorePage() {
  const { query, setQuery, filtered } = useExploreSearch(PEOPLE);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavSidebar activePath="/explore" />

      <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
        <header className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-8 py-4 border-b border-border bg-background shadow-sm">
          <div>
            <h1 className="text-[15px] font-semibold text-foreground leading-none">Explore</h1>
            <p className="text-[11px] text-muted-foreground mt-1">Find people who match your vibe</p>
          </div>
        </header>

        <div className="flex flex-col gap-6 px-4 md:px-8 py-5">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search by name, vibe, or interest…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted/40 pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            />
          </div>

          {query === "" && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Browse by Vibe</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {VIBES.map(({ icon: Icon, label, count, color }) => (
                  <button
                    key={label}
                    type="button"
                    className={cn(
                      "group relative flex items-center gap-3 rounded-2xl bg-linear-to-br p-4 text-left overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02]",
                      color
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
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">
              {query === "" ? "Suggested Matches" : `Results for "${query}"`}
            </h2>
            <div className="flex flex-col gap-2">
              {filtered.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors duration-150"
                >
                  <div className="relative shrink-0">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full bg-linear-to-br flex items-center justify-center text-sm font-bold text-white",
                        p.grad
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
                    <Sparkles size={11} className="text-primary" />
                    <span className="text-xs font-semibold text-primary">{p.vibeScore}%</span>
                  </div>

                  <button
                    type="button"
                    className="shrink-0 flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors duration-150 cursor-pointer"
                  >
                    <Zap size={11} />
                    Connect
                  </button>
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Search size={32} className="mb-3 opacity-30" />
                  <p className="text-sm">No matches found for &quot;{query}&quot;</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <BottomNav activePath="/explore" />
    </div>
  );
}
