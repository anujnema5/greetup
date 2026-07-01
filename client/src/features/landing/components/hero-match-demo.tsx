"use client";

import { useEffect, useReducer } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type Person = {
  name: string;
  tag: string;
  letter: string;
  avatarClass: string;
  note?: string;
};

type StoryStep = {
  id: string;
  filter: string;
  preference: string;
  scanLabel: string;
  switchLabel?: string;
  you: Person;
  peer: Person;
};

const STORY: StoryStep[] = [
  {
    id: "profession",
    filter: "By profession",
    preference: "Backend engineers",
    scanLabel: "Finding backend engineers…",
    you: { name: "You", tag: "Backend · Node", letter: "Y", avatarClass: "bg-[oklch(58%_0.14_285)]" },
    peer: {
      name: "Aarav",
      tag: "Backend · Go",
      letter: "A",
      avatarClass: "bg-[oklch(52%_0.12_295)]",
      note: "Hey, saw you're on Node too",
    },
  },
  {
    id: "activity",
    filter: "By activity",
    preference: "Play chess",
    scanLabel: "Finding a chess partner…",
    switchLabel: "Switched to chess",
    you: { name: "You", tag: "Chess · blitz", letter: "Y", avatarClass: "bg-[oklch(58%_0.14_285)]" },
    peer: {
      name: "Riya",
      tag: "Chess · 1200",
      letter: "R",
      avatarClass: "bg-[oklch(52%_0.12_295)]",
      note: "1+0 or 3+2?",
    },
  },
  {
    id: "interest",
    filter: "By interests",
    preference: "Artists",
    scanLabel: "Finding artists…",
    switchLabel: "Switched to interests",
    you: { name: "You", tag: "Illustrator · SF", letter: "Y", avatarClass: "bg-[oklch(62%_0.16_15)]" },
    peer: {
      name: "Mei",
      tag: "Visual artist · NYC",
      letter: "M",
      avatarClass: "bg-[oklch(58%_0.14_10)]",
      note: "Love your sketch style!",
    },
  },
  {
    id: "open",
    filter: "Open match",
    preference: "Anyone",
    scanLabel: "Finding someone new…",
    switchLabel: "Open to anyone",
    you: { name: "You", tag: "Open to anyone", letter: "Y", avatarClass: "bg-[oklch(68%_0.12_75)]" },
    peer: {
      name: "James",
      tag: "Jazz · Berlin",
      letter: "J",
      avatarClass: "bg-[oklch(62%_0.11_65)]",
      note: "Want to jam sometime?",
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
  if (state.phase === "shift") return { ...state, phase: "scan" };

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

  if (!active) return { step: 0, phase: "live" as Phase };
  return state;
}

function PersonCard({
  person,
  highlight,
  lite,
}: {
  person: Person;
  highlight?: boolean;
  lite: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center gap-2.5 rounded-xl border px-3 py-4 text-center transition-colors duration-300",
        highlight
          ? "border landing-gold-surface"
          : "border-border bg-card/50",
      )}
    >
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-full text-sm font-medium text-white/90 ring-2 ring-border",
          person.avatarClass,
        )}
      >
        {person.letter}
      </div>
      <div className="min-w-0 w-full">
        <p className="truncate text-sm font-medium landing-card-title">{person.name}</p>
        <p className="mt-0.5 truncate text-[11px] landing-card-muted">{person.tag}</p>
      </div>
      {highlight && !lite && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-full landing-status-live px-2 py-0.5 text-[10px] font-medium"
        >
          matched
        </motion.span>
      )}
    </div>
  );
}

function EmptySlot({ scanning, lite }: { scanning: boolean; lite: boolean }) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-border bg-card/35 px-3 py-4">
      {scanning && !lite && (
        <motion.div
          className="pointer-events-none absolute inset-2 rounded-lg border landing-step-ring-border"
          animate={{ opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <div className="size-12 rounded-full bg-muted ring-2 ring-border/60" />
      <p className="text-[11px] landing-card-muted">{scanning ? "Searching…" : "..."}</p>
    </div>
  );
}

function Connector({
  active,
  lite,
  scanning,
}: {
  active: boolean;
  lite: boolean;
  scanning?: boolean;
}) {
  if (scanning && !lite) {
    return (
      <div className="relative flex w-7 shrink-0 items-center self-center">
        <div className="h-px w-full bg-muted" />
        <motion.div
          className="absolute left-1/2 size-1.5 -translate-x-1/2 rounded-full landing-gold-dot shadow-[0_0_8px_oklch(from_var(--secondary)_l_c_h/0.55)] dark:shadow-[0_0_8px_oklch(88%_0.18_105/0.55)]"
          animate={{ x: [-9, 9, -9] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  }

  return (
    <div className="flex w-7 shrink-0 items-center self-center">
      <div className="h-px flex-1 bg-muted" />
      <motion.div
        className={cn("mx-1 size-1.5 shrink-0 rounded-full", active ? "landing-gold-dot" : "bg-foreground/15")}
        animate={active && !lite ? { scale: [1, 1.3, 1] } : undefined}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="h-px flex-1 bg-muted" />
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
  const connectorActive = linked || phase === "meet";

  const statusLabel = linked
    ? null
    : switching
      ? beat.switchLabel
      : scanning
        ? beat.scanLabel
        : phase === "meet"
          ? `${beat.peer.name} looks like a fit`
          : null;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="text-[11px] landing-card-muted">{beat.filter}</p>
          <AnimatePresence mode="wait">
            <motion.h3
              key={`${step}-${beat.preference}`}
              initial={lite ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="mt-1 text-lg font-semibold leading-tight landing-card-title sm:text-[1.35rem]"
            >
              {beat.preference}
            </motion.h3>
          </AnimatePresence>
        </div>
        <span
          className={cn(
            "mt-0.5 flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
            linked
              ? "landing-status-live"
              : "bg-muted/60 landing-card-muted",
          )}
        >
          {linked && (
            <span className="relative flex size-1.5">
              {!lite && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-secondary/45 dark:bg-[oklch(88%_0.18_105/0.45)]" />
              )}
              <span className="relative inline-flex size-1.5 rounded-full landing-gold-dot" />
            </span>
          )}
          {linked ? "Live" : "Searching"}
        </span>
      </div>

      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <div className="rounded-xl bg-card/55 p-2.5 ring-1 ring-border/60 ring-inset">
          <div className="flex items-stretch gap-1.5">
            <AnimatePresence mode="wait">
              <motion.div key={`you-${step}`} className="flex flex-1" initial={false} animate={{ opacity: 1 }}>
                <PersonCard person={beat.you} lite={lite} />
              </motion.div>
            </AnimatePresence>

            <Connector active={connectorActive} lite={lite} scanning={scanning} />

            <AnimatePresence mode="wait">
              {peerVisible ? (
                <motion.div
                  key={`${step}-${beat.peer.name}`}
                  className="flex flex-1"
                  initial={lite ? false : { opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.32, ease: EASE }}
                >
                  <PersonCard person={beat.peer} highlight={linked} lite={lite} />
                </motion.div>
              ) : (
                <motion.div key="slot" className="flex flex-1">
                  <EmptySlot scanning={scanning} lite={lite} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {linked && beat.peer.note && (
            <motion.div
              key={`msg-${step}`}
              initial={lite ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32, delay: 0.08, ease: EASE }}
              className="mt-3.5 flex gap-2.5"
            >
              <div
                className={cn(
                  "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium text-white/90",
                  beat.peer.avatarClass,
                )}
              >
                {beat.peer.letter}
              </div>
              <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-border bg-muted/60 px-3.5 py-2.5">
                <p className="text-xs leading-relaxed landing-card-muted">{beat.peer.note}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {(statusLabel || !lite) && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-5">
          <AnimatePresence mode="wait">
            {statusLabel && (
              <motion.p
                key={statusLabel}
                initial={lite ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs landing-card-muted"
              >
                {statusLabel}
              </motion.p>
            )}
          </AnimatePresence>

          {!lite && (
            <div className={cn("flex items-center gap-1.5", !statusLabel && "ml-auto")}>
              {STORY.map((s, i) => (
                <span
                  key={s.id}
                  className={cn(
                    "h-1 rounded-full transition-all duration-400",
                    i === step ? "w-4 bg-secondary/70 dark:bg-[oklch(88%_0.18_105/0.7)]" : "w-1 bg-foreground/14",
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
