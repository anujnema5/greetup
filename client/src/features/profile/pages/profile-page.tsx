"use client";

import { Sparkles, Video, Users, Star, Edit2, MapPin, LinkIcon } from "lucide-react";
import { NavSidebar, BottomNav } from "@/features/app-shell";
import { cn } from "@/lib/utils";
import { VIBES, STATS, RECENT_MATCHES, ACTIVITY } from "../constants/mock-data";

export function ProfilePage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavSidebar activePath="/profile" />

      <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
        <header className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-8 py-4 border-b border-border bg-background shadow-sm">
          <div>
            <h1 className="text-[15px] font-semibold text-foreground leading-none">Profile</h1>
            <p className="text-[11px] text-muted-foreground mt-1">Your vibe, your story</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-200 cursor-pointer"
          >
            <Edit2 size={13} />
            Edit
          </button>
        </header>

        <div className="flex flex-col gap-5 px-4 md:px-8 py-5">
          <div
            className="relative overflow-hidden rounded-3xl border border-border p-6"
            style={{
              background: `
                radial-gradient(ellipse 70% 50% at 50% 0%, oklch(88% 0.11 105 / 0.10) 0%, transparent 70%),
                oklch(17% 0.015 110)
              `,
            }}
          >
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div
                  className="h-20 w-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                  style={{
                    background: "radial-gradient(circle at 40% 35%, oklch(90% 0.11 105), oklch(78% 0.10 105))",
                    boxShadow: "0 0 30px oklch(88% 0.11 105 / 0.3)",
                  }}
                >
                  A
                </div>
                <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 border-2 border-card" />
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-foreground">Anuj N.</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Full-stack developer · Startup enthusiast</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin size={11} /> Mumbai, IN
                  </span>
                  <span className="flex items-center gap-1">
                    <LinkIcon size={11} /> circlo.app/@anuj
                  </span>
                </div>
              </div>

              <div
                className="shrink-0 flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 border"
                style={{ background: "oklch(88% 0.11 105 / 0.08)", borderColor: "oklch(88% 0.11 105 / 0.2)" }}
              >
                <Sparkles size={14} style={{ color: "oklch(88% 0.11 105)" }} />
                <span className="text-lg font-black" style={{ color: "oklch(88% 0.11 105)" }}>
                  87
                </span>
                <span className="text-[9px] text-muted-foreground font-medium">VIBE</span>
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Building cool stuff on the internet. Into deep conversations, indie music, and finding people who get it.
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {VIBES.map((v) => (
                <span
                  key={v}
                  className="rounded-full border px-3 py-1 text-xs font-medium"
                  style={{
                    borderColor: "oklch(88% 0.11 105 / 0.25)",
                    color: "oklch(88% 0.11 105)",
                    background: "oklch(88% 0.11 105 / 0.08)",
                  }}
                >
                  {v}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {STATS.map(({ label, value }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card py-3 px-2"
              >
                <span className="text-xl font-black text-foreground">{value}</span>
                <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Recent Matches</h3>
              <button type="button" className="text-xs text-primary hover:underline cursor-pointer">
                See all
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {RECENT_MATCHES.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors duration-150"
                >
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full bg-linear-to-br flex items-center justify-center text-sm font-bold text-white shrink-0",
                      m.grad
                    )}
                  >
                    {m.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.tagline}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Sparkles size={11} className="text-primary" />
                    <span className="text-xs font-semibold text-primary">{m.score}%</span>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors duration-150 cursor-pointer"
                  >
                    <Video size={11} />
                    Call
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card px-5 py-4">
            <div className="flex items-center gap-2 mb-4">
              <Star size={14} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Activity</h3>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              {ACTIVITY.map(({ action, time }) => (
                <div key={action} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Users size={13} className="text-primary shrink-0" />
                    <span>{action}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <BottomNav activePath="/profile" />
    </div>
  );
}
