'use client'

import { useState } from "react";
import { Search, Sparkles, Users, Zap, Music, Code, Palette, Globe, Coffee, Dumbbell } from "lucide-react";
import { NavSidebar, BottomNav } from "@/components/app-nav";
import { cn } from "@/lib/utils";

const VIBES = [
  { icon: Code,     label: "Tech & AI",       count: 312, color: "from-violet-500 to-indigo-600"  },
  { icon: Palette,  label: "Design",           count: 187, color: "from-pink-500 to-rose-600"      },
  { icon: Music,    label: "Music",            count: 243, color: "from-sky-500 to-blue-600"       },
  { icon: Globe,    label: "Travel",           count: 156, color: "from-emerald-500 to-teal-600"   },
  { icon: Coffee,   label: "Startups",         count: 98,  color: "from-amber-500 to-orange-600"  },
  { icon: Dumbbell, label: "Fitness",          count: 134, color: "from-red-500 to-rose-700"       },
];

const PEOPLE = [
  { name: "Mia C.",    tagline: "UI designer · Music lover",    initials: "MC", grad: "from-pink-400 to-rose-600",    vibeScore: 96, online: true  },
  { name: "Rohan V.",  tagline: "Full-stack dev · Founder",     initials: "RV", grad: "from-violet-400 to-indigo-600", vibeScore: 91, online: true  },
  { name: "Layla S.",  tagline: "Product manager · Traveller",  initials: "LS", grad: "from-sky-400 to-blue-600",     vibeScore: 88, online: false },
  { name: "Dev P.",    tagline: "Creative director · Writer",   initials: "DP", grad: "from-amber-400 to-orange-600", vibeScore: 85, online: true  },
  { name: "Isha T.",   tagline: "Data scientist · Musician",    initials: "IT", grad: "from-emerald-400 to-teal-600", vibeScore: 82, online: false },
  { name: "Karan M.",  tagline: "Indie hacker · Coffee nerd",   initials: "KM", grad: "from-red-400 to-rose-600",    vibeScore: 79, online: true  },
];

export default function ExplorePage() {
  const [query, setQuery] = useState("");

  const filtered = PEOPLE.filter(
    (p) =>
      query === "" ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.tagline.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavSidebar activePath="/explore" />

      <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-8 py-4 border-b border-border bg-background shadow-sm">
          <div>
            <h1 className="text-[15px] font-semibold text-foreground leading-none">Explore</h1>
            <p className="text-[11px] text-muted-foreground mt-1">Find people who match your vibe</p>
          </div>
        </header>

        <div className="flex flex-col gap-6 px-4 md:px-8 py-5">
          {/* Search bar */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, vibe, or interest…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted/40 pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            />
          </div>

          {/* Vibe categories */}
          {query === "" && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Browse by Vibe</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {VIBES.map(({ icon: Icon, label, count, color }) => (
                  <button
                    key={label}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-2xl bg-gradient-to-br p-4 text-left overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02]",
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

          {/* People list */}
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
                    <div className={cn("h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center text-sm font-bold text-white", p.grad)}>
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

                  <button className="shrink-0 flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors duration-150 cursor-pointer">
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
