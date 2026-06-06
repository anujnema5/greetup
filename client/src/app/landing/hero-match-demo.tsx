"use client";

import { useEffect, useReducer } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, MessageCircle, Video } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type Person = {
  name: string;
  tag: string;
  letter: string;
  color: string;
};

type StoryStep = {
  id: string;
  category: string;
  preference: string;
  scanLabel: string;
  switchLabel?: string;
  you: Person;
  peer: Person;
};

const STORY: StoryStep[] = [
  {
    id: "profession",
    category: "Profession",
    preference: "Backend engineers",
    scanLabel: "Scanning for backend engineers…",
    you: {
      name: "You",
      tag: "Backend · Node",
      letter: "Y",
      color: "from-violet-500 to-indigo-600",
    },
    peer: {
      name: "Aarav",
      tag: "Backend · Go",
      letter: "A",
      color: "from-violet-500 to-purple-600",
    },
  },
  {
    id: "interest",
    category: "Interests",
    preference: "Artists",
    scanLabel: "Scanning for artists…",
    switchLabel: "Preference updated",
    you: {
      name: "You",
      tag: "Illustrator · SF",
      letter: "Y",
      color: "from-rose-500 to-pink-500",
    },
    peer: {
      name: "Mei",
      tag: "Visual artist · NYC",
      letter: "M",
      color: "from-rose-500 to-pink-500",
    },
  },
  {
    id: "open",
    category: "Open",
    preference: "Anyone you want to meet",
    scanLabel: "Opening match pool…",
    switchLabel: "Open matching",
    you: {
      name: "You",
      tag: "Open to anyone",
      letter: "Y",
      color: "from-amber-500 to-orange-500",
    },
    peer: {
      name: "James",
      tag: "Jazz · Berlin",
      letter: "J",
      color: "from-amber-500 to-orange-500",
    },
  },
];

type Phase = "scan" | "meet" | "link" | "live" | "shift";

const PHASE_ORDER: Phase[] = ["scan", "meet", "link", "live", "shift"];

const PHASE_MS: Record<Phase, number> = {
  scan: 1800,
  meet: 650,
  link: 850,
  live: 3000,
  shift: 1100,
};

type DemoState = { step: number; phase: Phase };

function advanceDemo(state: DemoState): DemoState {
  if (state.phase === "shift") {
    return { ...state, phase: "scan" };
  }

  const idx = PHASE_ORDER.indexOf(state.phase);
  const next = PHASE_ORDER[idx + 1];
  if (!next) return state;

  if (next === "shift") {
    return { step: (state.step + 1) % STORY.length, phase: "shift" };
  }
  return { ...state, phase: next };
}

function useDemoLoop(active: boolean) {
  const [state, advance] = useReducer((s: DemoState) => advanceDemo(s), { step: 0, phase: "scan" });

  useEffect(() => {
    if (!active) return;
    const id = setTimeout(advance, PHASE_MS[state.phase]);
    return () => clearTimeout(id);
  }, [active, state.step, state.phase]);

  if (!active) {
    return { step: 0, phase: "live" as Phase };
  }
  return state;
}

function ScanRing({ lite }: { lite: boolean }) {
  if (lite) {
    return (
      <div className="relative flex size-10 shrink-0 items-center justify-center">
        <div className="size-10 rounded-full border border-white/10 bg-white/4" />
      </div>
    );
  }

  return (
    <div className="relative flex size-10 shrink-0 items-center justify-center">
      <motion.div
        className="absolute inset-0 rounded-full border border-[oklch(88%_0.11_105/0.25)]"
        animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
      />
      <motion.div
        className="absolute inset-1 rounded-full border border-[oklch(88%_0.11_105/0.18)]"
        animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0, 0.35] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 0.25 }}
      />
      <div className="relative size-10 rounded-full border border-white/8 bg-[oklch(12%_0.012_110)]">
        <motion.div
          className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-linear-to-r from-transparent via-[oklch(88%_0.11_105/0.5)] to-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </div>
  );
}

function ProfileRow({
  person,
  linked,
  lite,
  side,
  role,
}: {
  person: Person;
  linked: boolean;
  lite: boolean;
  side: "you" | "peer";
  role: string;
}) {
  const row = (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-300",
        linked && side === "peer" && "bg-[oklch(88%_0.11_105/0.04)] ring-1 ring-[oklch(88%_0.11_105/0.12)]",
        side === "you" && "bg-white/2",
      )}
    >
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-sm font-semibold text-white shadow-sm",
          person.color,
        )}
      >
        {person.letter}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">{role}</p>
        <p className="mt-0.5 text-sm font-medium leading-none text-white">{person.name}</p>
        <p className="mt-1 text-xs text-white/42">{person.tag}</p>
      </div>
      {linked && side === "peer" && (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[oklch(88%_0.11_105/0.14)]">
          <Check className="size-3.5 text-[oklch(88%_0.11_105)]" strokeWidth={2.5} />
        </div>
      )}
    </div>
  );

  if (lite) return row;

  return (
    <motion.div
      initial={{ opacity: 0, y: side === "you" ? -8 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: side === "you" ? -4 : 4 }}
      transition={{ duration: 0.32, ease: EASE }}
    >
      {row}
    </motion.div>
  );
}

function PeerSearching({ scanning, lite }: { scanning: boolean; lite: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/2 px-3 py-3">
      <ScanRing lite={lite || !scanning} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">Next match</p>
        <p className="mt-0.5 text-sm text-white/55">
          {scanning ? "Looking for a fit…" : "Waiting…"}
        </p>
      </div>
      {scanning && !lite && (
        <div className="flex gap-0.5">
          {[0, 0.15, 0.3].map((d) => (
            <motion.span
              key={d}
              className="size-1 rounded-full bg-[oklch(88%_0.11_105/0.7)]"
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: d }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StepTabs({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-white/4 p-0.5">
      {STORY.map((s, i) => (
        <div
          key={s.id}
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-medium transition-all duration-400",
            i === step
              ? "bg-[oklch(18%_0.013_110)] text-white/80 shadow-sm"
              : "text-white/28",
          )}
        >
          {s.category}
        </div>
      ))}
    </div>
  );
}

export function HeroMatchDemo({ lite }: { lite: boolean }) {
  const { step, phase } = useDemoLoop(!lite);
  const beat = STORY[step] ?? STORY[0]!;
  const linked = lite || phase === "link" || phase === "live";
  const peerVisible = lite || phase === "meet" || phase === "link" || phase === "live";
  const scanning = !lite && phase === "scan";
  const switching = !lite && phase === "shift";

  const statusLabel =
    linked
      ? "You're connected — say hi"
      : switching
        ? beat.switchLabel ?? "Updating…"
        : scanning
          ? beat.scanLabel
          : phase === "meet"
            ? "Match found"
            : null;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/7 bg-[oklch(15%_0.013_110)] shadow-[0_24px_64px_-28px_rgba(0,0,0,0.75)] sm:rounded-[1.35rem]">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background: `
            radial-gradient(ellipse 80% 55% at 50% -15%, oklch(88% 0.11 105 / 0.08) 0%, transparent 58%),
            radial-gradient(ellipse 40% 30% at 100% 100%, oklch(65% 0.15 280 / 0.05) 0%, transparent 60%)
          `,
        }}
        aria-hidden
      />

      <div className="relative flex items-center justify-between gap-3 border-b border-white/6 px-4 py-3 sm:px-5">
        <span className="text-xs font-medium text-white/40">Match</span>
        <StepTabs step={step} />
        <span
          className={cn(
            "shrink-0 text-[11px] font-medium",
            linked ? "text-[oklch(88%_0.11_105/0.85)]" : "text-white/35",
          )}
        >
          {linked ? "Live" : "Searching"}
        </span>
      </div>

      <div className="relative space-y-4 px-4 py-4 sm:space-y-5 sm:px-5 sm:py-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-white/35">Looking for</span>
            <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/45">
              {beat.category}
            </span>
          </div>
          <AnimatePresence mode="wait">
            <motion.h3
              key={`${step}-${beat.preference}`}
              initial={lite ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="text-xl font-semibold leading-tight tracking-tight text-white sm:text-[1.65rem]"
            >
              {beat.preference}
            </motion.h3>
          </AnimatePresence>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/6 bg-[oklch(13%_0.012_110/0.85)] p-1.5 ring-1 ring-white/4 ring-inset">
          <AnimatePresence mode="wait">
            <ProfileRow
              key={`you-${step}`}
              person={beat.you}
              linked={linked}
              lite={lite}
              side="you"
              role="You"
            />
          </AnimatePresence>

          <div className="relative mx-2 my-1 flex items-center justify-center py-0.5">
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/5" />
            <span
              className={cn(
                "relative rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                linked
                  ? "bg-[oklch(15%_0.013_110)] text-[oklch(88%_0.11_105/0.8)]"
                  : "bg-[oklch(15%_0.013_110)] text-white/30",
              )}
            >
              {linked ? "matched" : scanning ? "pairing" : "—"}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {peerVisible ? (
              <ProfileRow
                key={`${step}-${beat.peer.name}`}
                person={beat.peer}
                linked={linked}
                lite={lite}
                side="peer"
                role="Match"
              />
            ) : (
              <PeerSearching key="peer-slot" scanning={scanning} lite={lite} />
            )}
          </AnimatePresence>

          {scanning && !lite && (
            <div className="mx-1.5 mt-1.5 h-0.5 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full bg-[oklch(88%_0.11_105/0.55)]"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.75, ease: "easeInOut" }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-0.5">
          <AnimatePresence mode="wait">
            {statusLabel && (
              <motion.p
                key={statusLabel}
                initial={lite ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className={cn("text-xs", linked ? "text-white/52" : "text-white/36")}
              >
                {statusLabel}
              </motion.p>
            )}
          </AnimatePresence>

          {linked && (
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-white/5 text-white/45">
                <MessageCircle className="size-3.5" />
              </span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-[oklch(88%_0.11_105/0.12)] text-[oklch(88%_0.11_105/0.9)]">
                <Video className="size-3.5" />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
