'use client'

import { useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { setCallReturnPath } from "@/lib/call/call-return-path";
import {
  Video, Zap, Bell, Plus, Sparkles, ChevronRight,
  Users,
} from "lucide-react";
import { NavSidebar, BottomNav } from "@/components/app-nav";
import { cn } from "@/lib/utils";
import { useFindMatch } from "@/features/matching/hooks/useFindMatch";

// ─── Data ──────────────────────────────────────────────────────────────────────

const CIRCLES = [
  { id: 1, topic: "Tech & Startups",  host: "Arjun S.", count: 24, cover: "from-violet-600/80 via-violet-700/60 to-purple-900"  },
  { id: 2, topic: "Late Night Vibes", host: "Maya R.",  count: 12, cover: "from-pink-600/80 via-rose-700/60 to-pink-900"         },
  { id: 3, topic: "Creative Minds",   host: "Dev P.",   count: 38, cover: "from-sky-500/80 via-blue-700/60 to-indigo-900"        },
  { id: 4, topic: "Founders Corner",  host: "Sara L.",  count: 9,  cover: "from-amber-500/80 via-orange-600/60 to-orange-900"    },
  { id: 5, topic: "Mindfulness",      host: "Riya M.",  count: 17, cover: "from-emerald-500/80 via-teal-700/60 to-teal-900"     },
];

const CONNECTIONS = [
  { id: 1, name: "Alex M.",   sub: "Tech & Music",    mutual: 4, online: true,  initials: "AM", grad: "from-violet-400 to-violet-600" },
  { id: 2, name: "Priya K.",  sub: "Design & Travel", mutual: 6, online: false, initials: "PK", grad: "from-pink-400 to-rose-600"     },
  { id: 3, name: "Jordan L.", sub: "Fitness & Tech",  mutual: 3, online: true,  initials: "JL", grad: "from-sky-400 to-blue-600"      },
];

// ─── Hero ─────────────────────────────────────────────────────────────────────

function MatchOrb({ isSearching, onToggle }: { isSearching: boolean; onToggle: () => void }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      <div className="absolute rounded-full border border-primary/5"  style={{ inset: 0 }} />
      <div className="absolute rounded-full border border-primary/8"  style={{ inset: 22 }} />
      <div className="absolute rounded-full border border-primary/12" style={{ inset: 42 }} />

      <div
        className={cn("absolute rounded-full blur-xl transition-opacity duration-500", isSearching ? "opacity-35" : "opacity-20")}
        style={{ inset: 42, background: "var(--color-primary)" }}
      />

      <button
        onClick={onToggle}
        className={cn(
          "relative z-10 flex flex-col items-center justify-center gap-2 rounded-full text-primary-foreground font-semibold transition-all duration-500 cursor-pointer hover:scale-100",
          !isSearching && "hover:brightness-105"
        )}
        style={{
          width: 96, height: 96,
          willChange: "transform",
          transform: isSearching ? "scale(1.1) translateZ(0)" : "translateZ(0)",
          background: isSearching
            ? "radial-gradient(circle at 40% 35%, oklch(92% 0.13 105), oklch(80% 0.12 105))"
            : "radial-gradient(circle at 40% 35%, oklch(90% 0.11 105), oklch(78% 0.10 105))",
          boxShadow: isSearching
            ? "0 0 28px oklch(88% 0.11 105 / 0.35), 0 0 55px oklch(88% 0.11 105 / 0.12), inset 0 1px 0 oklch(96% 0.08 105 / 0.3)"
            : "0 0 18px oklch(88% 0.11 105 / 0.2), 0 8px 20px oklch(88% 0.11 105 / 0.15), inset 0 1px 0 oklch(96% 0.08 105 / 0.3)",
        }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/15 to-transparent" />
        <div className="relative flex flex-col items-center gap-1.5">
          {isSearching
            ? <><Zap size={18} fill="currentColor" className="animate-pulse" /><span className="text-[10px] font-bold tracking-wide">searching…</span></>
            : <><Video size={18} strokeWidth={2} /><span className="text-[10px] font-bold tracking-wide">Find Match</span></>
          }
        </div>
      </button>
    </div>
  );
}

function HeroSection({ appState, onToggle, onCancel, error }: {
  appState: "idle" | "searching" | "matched" | "error";
  onToggle: () => void;
  onCancel: () => void;
  error?: string | null;
}) {
  const isSearching = appState === "searching";

  const headingText =
    appState === "searching" ? "finding your people rn…" : "your vibe finds\nyour tribe.";

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-border flex flex-col items-center justify-center gap-4 py-6 px-4 md:gap-5 md:py-8 md:px-8"
      style={{
        background: `
          radial-gradient(ellipse 70% 50% at 50% 0%, oklch(88% 0.11 105 / 0.12) 0%, transparent 70%),
          radial-gradient(ellipse 50% 40% at 85% 85%, oklch(60% 0.2 280 / 0.07) 0%, transparent 60%),
          oklch(17% 0.015 110)
        `,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, oklch(100% 0 0 / 0.03) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 rounded-full blur-[100px] opacity-40" style={{ width: 480, height: 280, background: "oklch(88% 0.11 105 / 0.15)" }} />
      <div className="pointer-events-none absolute -bottom-16 -right-16 rounded-full blur-[80px] opacity-25"              style={{ width: 280, height: 280, background: "oklch(60% 0.2 280 / 0.1)"   }} />

      <div className="relative z-10 flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2 backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs text-muted-foreground">
          <span className="text-foreground font-semibold">1,240</span> people online
        </span>
      </div>

      <div className="relative z-10 text-center">
        <h2
          className="text-[1.8rem] md:text-[2.4rem] font-bold tracking-tight leading-[1.5]"
          style={{
            background: "linear-gradient(160deg, oklch(96% 0.01 110) 0%, oklch(88% 0.11 105) 55%, oklch(78% 0.08 110) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {headingText}
        </h2>
        <p className="mt-3 text-xs md:text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
          mood check → match made. network, vibe, or just talk to someone who gets it.
        </p>
      </div>

      <div className="relative z-10 scale-90 md:scale-100">
        <MatchOrb isSearching={isSearching} onToggle={onToggle} />
      </div>

      {isSearching && (
        <button onClick={onCancel} className="relative z-10 -mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 cursor-pointer">
          Cancel
        </button>
      )}

      {appState === "error" && error && (
        <p className="relative z-10 -mt-2 text-xs text-red-400 text-center max-w-xs">
          {error}
        </p>
      )}

      <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 md:gap-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Video size={12} className="text-primary" />
          <span><strong className="text-foreground">3</strong> matches today</span>
        </span>
        <span className="h-3 w-px bg-border hidden sm:block" />
        <span className="flex items-center gap-1.5">
          <Zap size={12} className="text-primary" />
          <span>Vibe score <strong className="text-foreground">87</strong></span>
        </span>
        <span className="h-3 w-px bg-border hidden sm:block" />
        <span className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-primary" />
          <span><strong className="text-foreground">8</strong> great matches waiting</span>
        </span>
      </div>
    </div>
  );
}

// ─── Match Found Overlay ───────────────────────────────────────────────────────


// ─── Circles Grid ──────────────────────────────────────────────────────────────

function CirclesGrid() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Active Circles</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Drop into a live conversation</p>
        </div>
        <button className="flex items-center gap-1 text-xs text-primary font-medium hover:underline cursor-pointer">
          See all <ChevronRight size={12} />
        </button>
      </div>

      <div
        className="flex gap-3 overflow-x-auto pb-1 md:overflow-visible md:grid md:gap-3 scrollbar-none"
        style={{ gridTemplateColumns: `repeat(${CIRCLES.length}, 1fr)` }}
      >
        {CIRCLES.map((c) => (
          <div
            key={c.id}
            className={cn(
              "group relative flex-none w-36 md:w-auto h-44 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 bg-linear-to-br",
              c.cover
            )}
            style={{ boxShadow: "0 1px 0 0 rgba(255,255,255,0.08) inset, 0 4px 20px rgba(0,0,0,0.4)" }}
          >
            <div className="absolute inset-x-0 top-0 h-16 bg-linear-to-b from-white/10 to-transparent pointer-events-none" />
            <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 group-hover:ring-white/25 transition-all duration-300 pointer-events-none" />

            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[9px] font-bold text-white tracking-widest">LIVE</span>
            </div>
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-1.5 py-0.5">
              <Users size={9} className="text-white/70" />
              <span className="text-[10px] text-white font-semibold">{c.count}</span>
            </div>

            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pt-8 pb-3">
              <p className="text-xs font-bold text-white leading-snug drop-shadow-sm">{c.topic}</p>
              <p className="text-[10px] text-white/50 mt-0.5">by {c.host}</p>
            </div>

            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span className="text-[11px] font-semibold text-white bg-white/15 border border-white/20 rounded-full px-3.5 py-1 backdrop-blur-sm shadow-lg">
                Join →
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Right Panel ───────────────────────────────────────────────────────────────

function RightPanel() {
  return (
    <aside className="hidden lg:flex flex-col gap-5 w-72 min-h-screen border-l border-border bg-card py-5 px-4">
      <button className="flex items-center justify-center gap-2 w-full rounded-lg border border-dashed border-border bg-muted/40 px-4 py-2 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all duration-200 cursor-pointer">
        <Plus size={15} />
        Start a Circle
      </button>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Now</h3>
          <button className="text-xs text-primary hover:underline cursor-pointer">See all</button>
        </div>
        <div className="flex flex-col gap-0.5">
          {CIRCLES.slice(0, 4).map((c) => (
            <button key={c.id} className="flex items-center justify-between w-full rounded-lg px-3 py-2.5 hover:bg-muted transition-colors duration-150 text-left cursor-pointer">
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
            <div key={conn.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-muted cursor-pointer transition-colors duration-150">
              <div className="relative shrink-0">
                <div className={cn("h-9 w-9 rounded-full bg-linear-to-br flex items-center justify-center text-xs font-bold text-white", conn.grad)}>
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
          {["ai & ml", "startups", "indie music", "design", "travel", "fitness"].map((tag) => (
            <span key={tag} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary cursor-pointer transition-colors duration-150">
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();

  const { findAMatch, cancelSearch, status, result, error } = useFindMatch();

  // Navigate to room once a match is found
  useEffect(() => {
    if (status !== "matched" || !result?.roomId) return;
    setCallReturnPath(pathname);
    const params = new URLSearchParams();
    if (result.peerId) params.set("peer", result.peerId);
    if (result.matchScore != null) params.set("score", String(Math.round(result.matchScore)));
    router.push(`/room/${result.roomId}?${params.toString()}`);
  }, [status, result, router, pathname]);

  const handleFindMatch = useCallback(() => {
    if (status === "idle" || status === "error") findAMatch();
  }, [status, findAMatch]);

  const handleCancel = useCallback(() => cancelSearch(), [cancelSearch]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavSidebar activePath="/" />

      <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-8 py-4 border-b border-border bg-background shadow-sm">
          <div>
            <h1 className="text-[15px] font-semibold text-foreground leading-none">Good evening, Anuj</h1>
            <p className="text-[11px] text-muted-foreground mt-1">Your vibe space is ready</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-200 cursor-pointer">
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
            </button>
            <div className="h-9 w-9 rounded-xl bg-linear-to-br from-primary/80 to-primary/40 flex items-center justify-center text-xs font-bold text-primary-foreground cursor-pointer">
              A
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-4 px-4 md:px-8 py-5">
          <HeroSection appState={status} onToggle={handleFindMatch} onCancel={handleCancel} error={error} />
          <CirclesGrid />

          <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
            <Sparkles size={15} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Your match quality is high today</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                We found 8 people with strong vibe alignment based on your profile. Hit Find Match to connect.
              </p>
            </div>
          </div>
        </div>
      </main>

      <RightPanel />
      <BottomNav activePath="/" />
    </div>
  );
}
