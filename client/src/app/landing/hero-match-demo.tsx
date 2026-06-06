"use client";

import { useEffect, useReducer } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type Person = {
  name: string;
  tag: string;
  letter: string;
  avatar: string;
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
    you: { name: "You", tag: "Backend · Node", letter: "Y", avatar: "oklch(58% 0.14 285)" },
    peer: {
      name: "Aarav",
      tag: "Backend · Go",
      letter: "A",
      avatar: "oklch(52% 0.12 295)",
      note: "Hey — saw you’re on Node too",
    },
  },
  {
    id: "interest",
    filter: "By interests",
    preference: "Artists",
    scanLabel: "Finding artists…",
    switchLabel: "Switched to interests",
    you: { name: "You", tag: "Illustrator · SF", letter: "Y", avatar: "oklch(62% 0.16 15)" },
    peer: {
      name: "Mei",
      tag: "Visual artist · NYC",
      letter: "M",
      avatar: "oklch(58% 0.14 10)",
      note: "Love your sketch style!",
    },
  },
  {
    id: "open",
    filter: "Open match",
    preference: "Anyone",
    scanLabel: "Finding someone new…",
    switchLabel: "Open to anyone",
    you: { name: "You", tag: "Open to anyone", letter: "Y", avatar: "oklch(68% 0.12 75)" },
    peer: {
      name: "James",
      tag: "Jazz · Berlin",
      letter: "J",
      avatar: "oklch(62% 0.11 65)",
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
        "flex flex-1 flex-col items-center gap-2 rounded-xl border px-3 py-3.5 text-center transition-colors duration-300",
        highlight
          ? "border-[oklch(88%_0.11_105/0.22)] bg-[oklch(88%_0.11_105/0.05)]"
          : "border-white/7 bg-white/2",
      )}
    >
      <div
        className="flex size-11 items-center justify-center rounded-full text-sm font-medium text-white/90"
        style={{ backgroundColor: person.avatar }}
      >
        {person.letter}
      </div>
      <div className="min-w-0 w-full">
        <p className="truncate text-sm font-medium text-white/90">{person.name}</p>
        <p className="mt-0.5 truncate text-[11px] text-white/42">{person.tag}</p>
      </div>
      {highlight && !lite && (
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-[10px] font-medium text-[oklch(88%_0.11_105/0.85)]"
        >
          matched
        </motion.span>
      )}
    </div>
  );
}

function EmptySlot({ scanning, lite }: { scanning: boolean; lite: boolean }) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/2 px-3 py-3.5">
      {scanning && !lite && (
        <motion.div
          className="pointer-events-none absolute inset-2 rounded-lg border border-[oklch(88%_0.11_105/0.2)]"
          animate={{ opacity: [0.35, 0, 0.35] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <div className="size-11 rounded-full bg-white/6" />
      <p className="text-[11px] text-white/32">{scanning ? "Searching…" : "—"}</p>
    </div>
  );
}

function Connector({ active, lite }: { active: boolean; lite: boolean }) {
  return (
    <div className="flex w-8 shrink-0 flex-col items-center justify-center self-center">
      <div className="h-px w-full bg-white/8" />
      <motion.div
        className={cn(
          "my-1 size-1.5 rounded-full",
          active ? "bg-[oklch(88%_0.11_105)]" : "bg-white/15",
        )}
        animate={active && !lite ? { scale: [1, 1.25, 1] } : undefined}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="h-px w-full bg-white/8" />
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
  const connectorActive = linked || phase === "meet" || phase === "link";

  const statusLabel = linked
    ? "Connected"
    : switching
      ? beat.switchLabel
      : scanning
        ? beat.scanLabel
        : phase === "meet"
          ? `${beat.peer.name} looks like a fit`
          : null;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/8 bg-[oklch(14.5%_0.012_110)] shadow-[0_16px_48px_-24px_rgba(0,0,0,0.7)]">
      <div className="flex items-start justify-between gap-3 border-b border-white/6 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="text-[11px] text-white/38">{beat.filter}</p>
          <AnimatePresence mode="wait">
            <motion.h3
              key={`${step}-${beat.preference}`}
              initial={lite ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="mt-1 text-lg font-semibold leading-tight text-white sm:text-xl"
            >
              {beat.preference}
            </motion.h3>
          </AnimatePresence>
        </div>
        {linked && (
          <span className="mt-0.5 flex shrink-0 items-center gap-1.5 text-[11px] text-[oklch(88%_0.11_105/0.9)]">
            <span className="relative flex size-1.5">
              {!lite && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[oklch(88%_0.11_105/0.45)]" />
              )}
              <span className="relative inline-flex size-1.5 rounded-full bg-[oklch(88%_0.11_105)]" />
            </span>
            Live
          </span>
        )}
      </div>

      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-stretch gap-2">
          <AnimatePresence mode="wait">
            <motion.div key={`you-${step}`} className="flex flex-1" initial={false} animate={{ opacity: 1 }}>
              <PersonCard person={beat.you} lite={lite} />
            </motion.div>
          </AnimatePresence>

          <Connector active={connectorActive} lite={lite} />

          <AnimatePresence mode="wait">
            {peerVisible ? (
              <motion.div
                key={`${step}-${beat.peer.name}`}
                className="flex flex-1"
                initial={lite ? false : { opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.3, ease: EASE }}
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

        <AnimatePresence mode="wait">
          {linked && beat.peer.note && (
            <motion.div
              key={`msg-${step}`}
              initial={lite ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.1, ease: EASE }}
              className="mt-4 rounded-xl rounded-tl-sm border border-white/7 bg-white/4 px-3.5 py-2.5"
            >
              <p className="text-[10px] text-white/35">{beat.peer.name}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-white/72">{beat.peer.note}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between border-t border-white/6 px-4 py-3 sm:px-5">
        <AnimatePresence mode="wait">
          {statusLabel && (
            <motion.p
              key={statusLabel}
              initial={lite ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn("text-xs", linked ? "text-white/45" : "text-white/35")}
            >
              {statusLabel}
            </motion.p>
          )}
        </AnimatePresence>

        {!lite && (
          <div className="flex items-center gap-1.5">
            {STORY.map((s, i) => (
              <span
                key={s.id}
                className={cn(
                  "h-1 rounded-full transition-all duration-400",
                  i === step ? "w-3.5 bg-[oklch(88%_0.11_105/0.75)]" : "w-1 bg-white/15",
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
