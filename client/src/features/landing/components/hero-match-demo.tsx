"use client";

import { useEffect, useReducer } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Video } from "lucide-react";
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
    id: "activity-vent",
    filter: "By activity",
    preference: "Vent",
    scanLabel: "Looking for someone to vent with…",
    switchLabel: "Vent",
    you: { name: "You", tag: "Vent", letter: "Y", avatarClass: "bg-[oklch(58%_0.14_285)]" },
    peer: {
      name: "Sofia",
      tag: "Vent",
      letter: "S",
      avatarClass: "bg-[oklch(52%_0.12_295)]",
      note: "Hey — want to get something off your chest?",
    },
  },
  {
    id: "activity-chess",
    filter: "By activity",
    preference: "Play chess",
    scanLabel: "Looking for a chess partner…",
    switchLabel: "Play chess",
    you: { name: "You", tag: "Play chess", letter: "Y", avatarClass: "bg-[oklch(58%_0.14_285)]" },
    peer: {
      name: "Riya",
      tag: "Play chess",
      letter: "R",
      avatarClass: "bg-[oklch(52%_0.12_295)]",
      note: "Hey! Up for a game once we've said hi?",
    },
  },
  {
    id: "quick-match",
    filter: "Quick match",
    preference: "Yap",
    scanLabel: "Looking for someone to talk with…",
    switchLabel: "Quick match",
    you: { name: "You", tag: "Yap", letter: "Y", avatarClass: "bg-[oklch(62%_0.16_15)]" },
    peer: {
      name: "James",
      tag: "Movies & sports",
      letter: "J",
      avatarClass: "bg-[oklch(62%_0.11_65)]",
      note: "Hey! Just matched with you 👋",
    },
  },
  {
    id: "activity-language",
    filter: "By activity",
    preference: "Practice language",
    scanLabel: "Looking for a practice partner…",
    switchLabel: "Practice language",
    you: { name: "You", tag: "Spanish", letter: "Y", avatarClass: "bg-[oklch(68%_0.12_75)]" },
    peer: {
      name: "Mei",
      tag: "Spanish",
      letter: "M",
      avatarClass: "bg-[oklch(58%_0.14_10)]",
      note: "Want to practice speaking together?",
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

function DemoSearchingState({
  lite,
  filter,
  preference,
}: {
  lite: boolean;
  filter: string;
  preference: string;
}) {
  const matchMode = filter === "By activity" ? "Match by activity" : "Quick match";

  return (
    <div className="relative mx-auto w-full max-w-[17rem] py-1">
      <div className="relative flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-3.5 py-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/18 text-primary">
          {lite ? (
            <Video className="size-[18px]" strokeWidth={2} aria-hidden />
          ) : (
            <Loader2 className="size-[18px] animate-spin" aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-semibold landing-card-title">{matchMode}</span>
          <span className="mt-0.5 block text-xs leading-snug landing-card-muted">
            Finding someone for you
          </span>
          <span className="mt-1 block truncate text-[10px] landing-card-muted/80">{preference}</span>
        </span>
      </div>
    </div>
  );
}

function MatchedPeerCard({
  person,
  lite,
  linked,
  showNote,
}: {
  person: Person;
  lite: boolean;
  linked: boolean;
  showNote?: boolean;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-3 py-1">
      <span className="match-found-badge">Match found</span>

      <div className="flex flex-col items-center gap-2 text-center">
        <div
          className={cn(
            "match-found-avatar-fallback flex size-16 items-center justify-center rounded-full text-lg font-bold sm:size-[4.5rem]",
            person.avatarClass,
          )}
        >
          {person.letter}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold landing-card-title sm:text-base">{person.name}</p>
          <p className="mt-0.5 text-[11px] landing-card-muted">{person.tag}</p>
        </div>
        {linked && !lite && (
          <span className="rounded-full landing-status-live px-2 py-0.5 text-[10px] font-medium">
            Ready to connect
          </span>
        )}
      </div>

      {showNote && person.note ? (
        <motion.div
          initial={lite ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="w-full rounded-2xl rounded-tl-md border border-border bg-muted/60 px-3.5 py-2.5 text-center"
        >
          <p className="text-xs leading-relaxed landing-card-muted">{person.note}</p>
        </motion.div>
      ) : null}
    </div>
  );
}

export function HeroMatchDemo({ lite }: { lite: boolean }) {
  const { step, phase } = useDemoLoop(!lite);
  const beat = STORY[step] ?? STORY[0]!;
  const linked = lite || phase === "link" || phase === "live";
  const peerVisible = lite || phase === "meet" || phase === "link" || phase === "live";
  const scanning = !lite && (phase === "scan" || phase === "shift");
  const switching = !lite && phase === "shift";

  const statusLabel = linked
    ? null
    : switching
      ? beat.switchLabel
      : scanning
        ? beat.scanLabel
        : phase === "meet"
          ? `${beat.peer.name} is a match`
          : null;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="text-[11px] landing-card-muted">
            {beat.filter === "By activity" ? "Match by activity" : "Quick match"}
          </p>
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
        <div className="rounded-xl bg-card/55 p-3 ring-1 ring-border/60 ring-inset min-h-[11.5rem] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {scanning ? (
              <motion.div
                key={`search-${step}`}
                initial={lite ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.28, ease: EASE }}
                className="flex w-full flex-col items-center gap-3 py-2"
              >
                <DemoSearchingState
                  lite={lite}
                  filter={beat.filter}
                  preference={beat.preference}
                />
              </motion.div>
            ) : peerVisible ? (
              <motion.div
                key={`match-${step}-${beat.peer.name}`}
                className="w-full"
                initial={lite ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.32, ease: EASE }}
              >
                <MatchedPeerCard
                  person={beat.peer}
                  lite={lite}
                  linked={linked}
                  showNote={linked && Boolean(beat.peer.note)}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
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
