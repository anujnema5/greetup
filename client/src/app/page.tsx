'use client'

import { useState, useEffect, useCallback } from "react";
import { useSocket } from "@/lib/socket";
import {
  Home, Search, Users, Clock, User, Settings,
  Video, Zap, Bell, Plus, Sparkles, ChevronRight,
  Mic, MicOff, VideoOff, PhoneOff, MessageCircle, Signal,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

type AppState = "idle" | "searching" | "matched" | "connected";

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

const NAV_ITEMS = [
  { icon: Home,   label: "Home",        active: true },
  { icon: Search, label: "Explore"                   },
  { icon: Users,  label: "Connections"               },
  { icon: Clock,  label: "History"                   },
  { icon: User,   label: "Profile"                   },
];

const MOCK_MATCH = {
  name: "Zara K.",
  initials: "ZK",
  gradFrom: "#7c3aed",
  gradTo: "#4f46e5",
  tagline: "Product designer · Startup founder",
  vibes: ["design", "startups", "indie music"],
  mutual: 3,
  vibeScore: 94,
};

// ─── Left Nav ─────────────────────────────────────────────────────────────────

function NavSidebar() {
  return (
    <aside className="hidden md:flex flex-col items-center gap-1 w-16 min-h-screen border-r border-border bg-card py-5 px-2">
      <div className="mb-6 h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
        <span className="text-sm font-black text-primary-foreground">C</span>
      </div>

      <nav className="flex flex-col items-center gap-1 flex-1">
        {NAV_ITEMS.map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            title={label}
            className={cn(
              "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
            {active && (
              <span className="absolute left-0 inset-y-2.5 w-0.5 rounded-r-full bg-primary" />
            )}
          </button>
        ))}
      </nav>

      <button
        title="Settings"
        className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 cursor-pointer"
      >
        <Settings size={18} strokeWidth={1.8} />
      </button>
    </aside>
  );
}

// ─── Bottom Nav (mobile only) ─────────────────────────────────────────────────

function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 flex items-center justify-around border-t border-border bg-card/95 backdrop-blur-sm py-2 safe-area-inset-bottom">
      {NAV_ITEMS.map(({ icon: Icon, label, active }) => (
        <button
          key={label}
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all duration-200 cursor-pointer",
            active ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
          <span className="text-[10px] font-medium">{label}</span>
        </button>
      ))}
    </nav>
  );
}

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

function HeroSection({ appState, onToggle, onCancel }: {
  appState: AppState;
  onToggle: () => void;
  onCancel: () => void;
}) {
  const isSearching = appState === "searching";

  const headingText = {
    idle:      "your vibe finds\nyour tribe.",
    searching: "finding your people rn…",
    matched:   "your vibe finds\nyour tribe.",
    connected: "your vibe finds\nyour tribe.",
  }[appState];

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
          className="text-[1.8rem] md:text-[2.4rem] font-bold tracking-tight leading-[1.1]"
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

function MatchFoundOverlay({ onConnect, onSkip }: { onConnect: () => void; onSkip: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)" }}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: "oklch(16% 0.015 110)",
          border: "1px solid oklch(30% 0.015 110)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px oklch(88% 0.11 105 / 0.08)",
          animation: "slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        {/* Top glow */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-30"
          style={{ background: "radial-gradient(ellipse 80% 100% at 50% 0%, oklch(88% 0.11 105 / 0.35), transparent)" }}
        />

        <div className="relative px-6 pt-7 pb-6 flex flex-col items-center gap-5">

          {/* Badge */}
          <div
            className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold"
            style={{
              background: "oklch(88% 0.11 105 / 0.12)",
              border: "1px solid oklch(88% 0.11 105 / 0.25)",
              color: "oklch(88% 0.11 105)",
            }}
          >
            <Sparkles size={11} />
            Match Found
          </div>

          {/* Avatar */}
          <div className="relative">
            <div
              className="absolute -inset-2 rounded-full opacity-40 blur-md"
              style={{ background: `linear-gradient(135deg, ${MOCK_MATCH.gradFrom}, ${MOCK_MATCH.gradTo})` }}
            />
            <div
              className="relative h-24 w-24 rounded-full flex items-center justify-center text-2xl font-bold text-white"
              style={{
                background: `linear-gradient(135deg, ${MOCK_MATCH.gradFrom}, ${MOCK_MATCH.gradTo})`,
                boxShadow: "0 0 0 3px oklch(16% 0.015 110), 0 0 0 4px oklch(30% 0.015 110)",
              }}
            >
              {MOCK_MATCH.initials}
            </div>
            <span
              className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-400 border-2"
              style={{ borderColor: "oklch(16% 0.015 110)" }}
            />
          </div>

          {/* Name & tagline */}
          <div className="text-center">
            <h3 className="text-lg font-bold text-white">{MOCK_MATCH.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{MOCK_MATCH.tagline}</p>
          </div>

          {/* Vibe score bar */}
          <div
            className="w-full rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{ background: "oklch(22% 0.015 110)", border: "1px solid oklch(28% 0.015 110)" }}
          >
            <Zap size={13} style={{ color: "oklch(88% 0.11 105)" }} />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-muted-foreground">Vibe alignment</span>
                <span className="text-[11px] font-bold" style={{ color: "oklch(88% 0.11 105)" }}>{MOCK_MATCH.vibeScore}%</span>
              </div>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${MOCK_MATCH.vibeScore}%`,
                    background: "linear-gradient(90deg, oklch(80% 0.10 105), oklch(88% 0.13 105))",
                    animation: "growBar 0.8s 0.3s cubic-bezier(0.34,1.1,0.64,1) both",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Shared vibes */}
          <div className="flex flex-wrap gap-2 justify-center">
            {MOCK_MATCH.vibes.map((v) => (
              <span
                key={v}
                className="rounded-full px-3 py-1 text-[11px] font-medium"
                style={{
                  background: "oklch(22% 0.015 110)",
                  border: "1px solid oklch(30% 0.015 110)",
                  color: "oklch(75% 0.015 110)",
                }}
              >
                {v}
              </span>
            ))}
            <span
              className="rounded-full px-3 py-1 text-[11px] font-medium"
              style={{
                background: "oklch(22% 0.015 110)",
                border: "1px solid oklch(30% 0.015 110)",
                color: "oklch(75% 0.015 110)",
              }}
            >
              +{MOCK_MATCH.mutual} mutual
            </span>
          </div>

          {/* CTAs */}
          <div className="flex w-full gap-3 pt-1">
            <button
              onClick={onSkip}
              className="flex-1 rounded-xl py-3 text-sm font-semibold transition-all duration-200 cursor-pointer hover:brightness-110"
              style={{
                background: "oklch(22% 0.015 110)",
                border: "1px solid oklch(30% 0.015 110)",
                color: "oklch(70% 0.015 110)",
              }}
            >
              Skip
            </button>
            <button
              onClick={onConnect}
              className="flex-[2] rounded-xl py-3 text-sm font-bold transition-all duration-200 cursor-pointer hover:brightness-110 flex items-center justify-center gap-2"
              style={{
                background: "radial-gradient(circle at 40% 35%, oklch(92% 0.13 105), oklch(80% 0.12 105))",
                color: "oklch(20% 0.03 110)",
                boxShadow: "0 0 20px oklch(88% 0.11 105 / 0.25), 0 4px 12px oklch(88% 0.11 105 / 0.15)",
              }}
            >
              <Video size={15} strokeWidth={2.2} />
              Connect
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes growBar {
          from { width: 0%; }
        }
      `}</style>
    </div>
  );
}

// ─── Connected View ────────────────────────────────────────────────────────────

function ConnectedView({ onEnd }: { onEnd: () => void }) {
  const [muted,   setMuted]   = useState(false);
  const [camOff,  setCamOff]  = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "oklch(8% 0.01 110)" }}>

      {/* ── Remote video ─────────────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">

        {/* Mock video background */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${MOCK_MATCH.gradFrom}33, oklch(8% 0.01 110) 60%, ${MOCK_MATCH.gradTo}22)`,
          }}
        />

        {/* Remote avatar centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div
              className="h-28 w-28 rounded-full flex items-center justify-center text-3xl font-bold text-white"
              style={{
                background: `linear-gradient(135deg, ${MOCK_MATCH.gradFrom}, ${MOCK_MATCH.gradTo})`,
                boxShadow: `0 0 60px ${MOCK_MATCH.gradFrom}55, 0 0 120px ${MOCK_MATCH.gradFrom}22`,
              }}
            >
              {MOCK_MATCH.initials}
            </div>
            <div
              className="absolute -inset-3 rounded-full animate-pulse"
              style={{
                background: `radial-gradient(circle, ${MOCK_MATCH.gradFrom}30, transparent 70%)`,
                animationDuration: "2.5s",
              }}
            />
          </div>
        </div>

        {/* Top bar */}
        <div
          className="absolute top-0 inset-x-0 flex items-center justify-between px-5 pt-5 pb-10"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 rounded-full px-3 py-1.5"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[11px] font-bold text-white tracking-widest">LIVE</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">{MOCK_MATCH.name}</p>
              <p className="text-[11px] text-white/50 mt-0.5">{MOCK_MATCH.tagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Timer */}
            <div
              className="rounded-full px-3 py-1.5 text-[12px] font-mono font-semibold text-white/70"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}
            >
              {fmt(elapsed)}
            </div>
            {/* Signal bars */}
            <div className="flex items-end gap-0.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-1 rounded-sm"
                  style={{ height: 4 + i * 3, background: i <= 3 ? "oklch(88% 0.11 105)" : "rgba(255,255,255,0.2)" }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Vibe score badge */}
        <div
          className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{
            background: "rgba(0,0,0,0.4)",
            border: "1px solid oklch(88% 0.11 105 / 0.2)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Sparkles size={11} style={{ color: "oklch(88% 0.11 105)" }} />
          <span className="text-[11px] font-semibold" style={{ color: "oklch(88% 0.11 105)" }}>
            {MOCK_MATCH.vibeScore}% match
          </span>
        </div>

        {/* Local PiP */}
        <div
          className="absolute bottom-6 right-5 rounded-2xl overflow-hidden"
          style={{
            width: 100, height: 136,
            border: "2px solid rgba(255,255,255,0.15)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          {camOff ? (
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-1.5"
              style={{ background: "oklch(18% 0.015 110)" }}
            >
              <VideoOff size={18} className="text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Cam off</span>
            </div>
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, oklch(30% 0.04 105), oklch(20% 0.02 110))" }}
            >
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold"
                style={{
                  background: "radial-gradient(circle at 40% 35%, oklch(90% 0.11 105), oklch(78% 0.10 105))",
                  color: "oklch(20% 0.03 110)",
                }}
              >
                A
              </div>
            </div>
          )}
          <div className="absolute bottom-1.5 left-0 right-0 text-center">
            <span className="text-[9px] text-white/60 font-medium">You</span>
          </div>
        </div>
      </div>

      {/* ── Controls bar ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-center gap-4 px-6 py-5"
        style={{ background: "oklch(11% 0.012 110)", borderTop: "1px solid oklch(20% 0.012 110)" }}
      >
        {/* Mic */}
        <button onClick={() => setMuted((v) => !v)} className="flex flex-col items-center gap-1.5 cursor-pointer group">
          <div
            className={cn(
              "rounded-2xl flex items-center justify-center transition-all duration-200 group-hover:brightness-110",
              muted ? "bg-red-500/20 border border-red-500/40" : "border border-white/10 hover:bg-white/10"
            )}
            style={{ width: 52, height: 52 }}
          >
            {muted ? <MicOff size={20} className="text-red-400" /> : <Mic size={20} className="text-white/70" />}
          </div>
          <span className="text-[10px] text-white/40">{muted ? "Unmute" : "Mute"}</span>
        </button>

        {/* Camera */}
        <button onClick={() => setCamOff((v) => !v)} className="flex flex-col items-center gap-1.5 cursor-pointer group">
          <div
            className={cn(
              "rounded-2xl flex items-center justify-center transition-all duration-200 group-hover:brightness-110",
              camOff ? "bg-red-500/20 border border-red-500/40" : "border border-white/10 hover:bg-white/10"
            )}
            style={{ width: 52, height: 52 }}
          >
            {camOff ? <VideoOff size={20} className="text-red-400" /> : <Video size={20} className="text-white/70" />}
          </div>
          <span className="text-[10px] text-white/40">{camOff ? "Start cam" : "Stop cam"}</span>
        </button>

        {/* End call */}
        <button onClick={onEnd} className="flex flex-col items-center gap-1.5 cursor-pointer group">
          <div
            className="rounded-2xl flex items-center justify-center bg-red-500 hover:bg-red-400 transition-all duration-200"
            style={{ width: 62, height: 62 }}
          >
            <PhoneOff size={22} className="text-white" />
          </div>
          <span className="text-[10px] text-white/40">End</span>
        </button>

        {/* Chat */}
        <button className="flex flex-col items-center gap-1.5 cursor-pointer group">
          <div
            className="rounded-2xl flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all duration-200"
            style={{ width: 52, height: 52 }}
          >
            <MessageCircle size={20} className="text-white/70" />
          </div>
          <span className="text-[10px] text-white/40">Chat</span>
        </button>

        {/* Report */}
        <button className="flex flex-col items-center gap-1.5 cursor-pointer group">
          <div
            className="rounded-2xl flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all duration-200"
            style={{ width: 52, height: 52 }}
          >
            <Signal size={20} className="text-white/70" />
          </div>
          <span className="text-[10px] text-white/40">Report</span>
        </button>
      </div>
    </div>
  );
}

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
  useSocket();
  const [appState, setAppState] = useState<AppState>("idle");

  // Mock: auto-fire match after 3s of searching
  useEffect(() => {
    if (appState !== "searching") return;
    const t = setTimeout(() => setAppState("matched"), 3000);
    return () => clearTimeout(t);
  }, [appState]);

  const handleFindMatch = useCallback(() => {
    if (appState === "idle") setAppState("searching");
  }, [appState]);

  const handleCancel  = useCallback(() => setAppState("idle"),      []);
  const handleConnect = useCallback(() => setAppState("connected"), []);
  const handleSkip    = useCallback(() => setAppState("idle"),      []);
  const handleEnd     = useCallback(() => setAppState("idle"),      []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavSidebar />

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
          <HeroSection appState={appState} onToggle={handleFindMatch} onCancel={handleCancel} />
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
      <BottomNav />

      {/* ── Overlays ─────────────────────────────────────────────────────────── */}
      {appState === "matched" && (
        <MatchFoundOverlay onConnect={handleConnect} onSkip={handleSkip} />
      )}
      {appState === "connected" && (
        <ConnectedView onEnd={handleEnd} />
      )}
    </div>
  );
}
