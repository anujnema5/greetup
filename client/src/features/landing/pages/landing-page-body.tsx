"use client";

import {
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  motion,
  useInView,
  AnimatePresence,
  type Variants,
} from "framer-motion";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Zap,
  Users,
  MessageCircle,
  ArrowRight,
  MapPin,
  Globe,
  Shield,
  ShieldCheck,
  Lightbulb,
  Send,
  Video,
  Phone,
  MicOff,
  PhoneOff,
  Volume2,
  Wind,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EARLY_RELEASE } from "@/lib/copy/user-messages";
import { FOOTER_LINKS } from "@/lib/copy/marketing-pages";
import { useLandingEntryCta } from "../hooks/use-landing-entry-cta";
import { LandingPerfProvider, useLandingPerf } from "../hooks/use-landing-perf";
import { LandingActivityChips } from "../components/landing-activity-chips";
import { LandingCuesDemo } from "../components/landing-cues-demo";
import { LandingConversationCueToast } from "../components/landing-conversation-cue-toast";
import { LANDING_SESSION_ACTIVITIES } from "../lib/landing-activities";
import { LANDING_CONVERSATION_CUE_EXAMPLES } from "../lib/landing-conversation-cues";

/* ─── easing ────────────────────────────────────────────────────────────────── */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* precomputed so VoiceMockup stays a pure render function */
const WAVE_BARS = [
  { heightClass: "h-[14px]", peak: 14, duration: 0.62 },
  { heightClass: "h-[22px]", peak: 22, duration: 0.71 },
  { heightClass: "h-[18px]", peak: 18, duration: 0.58 },
  { heightClass: "h-[26px]", peak: 26, duration: 0.83 },
  { heightClass: "h-[16px]", peak: 16, duration: 0.65 },
  { heightClass: "h-[24px]", peak: 24, duration: 0.74 },
  { heightClass: "h-[20px]", peak: 20, duration: 0.69 },
  { heightClass: "h-[28px]", peak: 28, duration: 0.88 },
  { heightClass: "h-[15px]", peak: 15, duration: 0.61 },
  { heightClass: "h-[23px]", peak: 23, duration: 0.76 },
  { heightClass: "h-[19px]", peak: 19, duration: 0.67 },
  { heightClass: "h-[25px]", peak: 25, duration: 0.8 },
] as const;

/* ─── variants ──────────────────────────────────────────────────────────────── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
};
const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.22, ease: "easeOut" } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0 } },
};
const cardIn: Variants = {
  hidden: { opacity: 0, y: 8, scale: 1 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.28, ease: "easeOut" } },
};

/* ─── data ──────────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Sparkles,
    label: "Activity match",
    desc: "Pick chess, vent, yap, study together, language practice, or another activity — then match with someone who wants to do the same.",
    tint: "from-secondary/15 to-transparent",
    iconClass: "text-secondary bg-secondary/10 border-secondary/20",
  },
  {
    icon: Users,
    label: "Spaces",
    desc: "Spaces are group rooms where people meet around shared interests and talk live.",
    tint: "from-violet-400/15 to-transparent",
    iconClass: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  },
  {
    icon: ShieldCheck,
    label: "Safe & Secure",
    desc: "AI checks video for NSFW content, we moderate actively, and the community is full of people who actually want to connect.",
    tint: "from-emerald-400/15 to-transparent",
    iconClass: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  {
    icon: MessageCircle,
    label: "Instant Connect",
    desc: "Chat, voice, and video instantly — plus in-call chess. Invite friends into private spaces or keep it 1:1.",
    tint: "from-sky-400/15 to-transparent",
    iconClass: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  },
];

const MATCHING_SIGNALS = [
  {
    icon: Sparkles,
    title: "By activity",
    desc: "Match for chess, vent, yap, study sessions, language practice, or any activity you pick before you connect.",
  },
  {
    icon: Users,
    title: "By person type",
    desc: "Choose who you want to meet: friends, collaborators, mentors, learners, or new networking partners.",
  },
  {
    icon: Lightbulb,
    title: "By profession + interests",
    desc: "Find people through profession and shared interests so your conversations start with real common ground.",
  },
  {
    icon: MapPin,
    title: "By location",
    desc: "Connect nearby, in your city, across your country, or globally when you want a wider reach.",
  },
  {
    icon: Globe,
    title: "In real time",
    desc: "Matching updates live, so new relevant people and spaces appear as soon as they are active.",
  },
];

const COMM_TABS = [
  { id: "chat",  label: "Chat",       icon: MessageCircle },
  { id: "video", label: "Video call", icon: Video          },
  { id: "voice", label: "Voice call", icon: Phone          },
] as const;
type CommTab = (typeof COMM_TABS)[number]["id"];

const STEPS = [
  { n: "01", title: "Pick your activity", desc: "Choose chess, vent, yap, or another activity — plus your interests and the kind of people you want to meet." },
  { n: "02", title: "Get matched", desc: "Our engine finds people with real alignment — same activity, same wavelength, not just the same city." },
  { n: "03", title: "Connect & grow", desc: "Chat, call, play chess in-call, or hop into a space together. Build real relationships naturally." },
];

const TRUST = [
  { icon: Sparkles,    label: "Activity match"      },
  { icon: ShieldCheck, label: "NSFW protected"      },
  { icon: Shield,      label: "Secure by design"    },
  { icon: Zap,         label: "Real-time matching"  },
  { icon: Globe,       label: "Nearby or global"    },
];

const SPACE_ACTIVITY_CHIPS: ReadonlyArray<{ label: string; comingSoon?: boolean }> = [
  { label: "Startup Founder Night Talk" },
  { label: "Jam Session for Musicians" },
  { label: "Chess Blitz Room" },
  { label: "Watch Together (YouTube)", comingSoon: true },
  { label: "Icebreaker ideas", comingSoon: true },
  { label: "Draw Together", comingSoon: true },
  { label: "Study Together", comingSoon: true },
  { label: "Debate Room", comingSoon: true },
  { label: "Truth or Dare", comingSoon: true },
  { label: "Music Room", comingSoon: true },
  { label: "Live Polls", comingSoon: true },
];

const STEP_RING_COUNT = 3;

const STEP_RING_DELAYS = [
  ["delay-0", "delay-1000", "delay-[2s]"],
  ["delay-200", "delay-[1200ms]", "delay-[2200ms]"],
  ["delay-400", "delay-[1400ms]", "delay-[2400ms]"],
] as const;

function StepRippleRings({ stepIndex }: { stepIndex: number }) {
  const delays = STEP_RING_DELAYS[stepIndex] ?? STEP_RING_DELAYS[0];

  return (
    <>
      {Array.from({ length: STEP_RING_COUNT }, (_, ri) => (
        <div
          key={ri}
          className={cn(
            "landing-step-ring pointer-events-none absolute inset-0 rounded-full border landing-step-ring-border",
            delays[ri],
          )}
        />
      ))}
    </>
  );
}

const LIVE_STREAM_EXAMPLES = [
  {
    title: "Music listening room",
    topic: "Share tracks and talk through lyrics together",
    category: "Music",
    platforms: ["YouTube", "Twitch"],
  },
  {
    title: "Open sketch studio",
    topic: "Collaborative drawing and visual critiques",
    category: "Art",
    platforms: ["YouTube", "Kick"],
  },
  {
    title: "Late night philosophy room",
    topic: "Meaning, ethics, and modern life discussions",
    category: "Philosophy",
    platforms: ["YouTube", "X Live"],
  },
  {
    title: "Creative writing space",
    topic: "Poetry prompts and short reading sessions",
    category: "Writing",
    platforms: ["YouTube", "Twitch"],
  },
];

/* ─── Scroll-reveal wrapper ──────────────────────────────────────────────────── */
function RevealSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref} variants={stagger} initial="hidden" animate={inView ? "show" : "hidden"} className={className}>
      {children}
    </motion.div>
  );
}

/* ─── Communication tab mockups ──────────────────────────────────────────────── */
function ChatMockup() {
  const { lite } = useLandingPerf();
  const cue = LANDING_CONVERSATION_CUE_EXAMPLES[0]!;
  return (
    <div className="flex flex-col gap-3 p-5">
      <motion.div
        initial={lite ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={lite ? { duration: 0 } : { duration: 0.35, ease: EASE }}
        className="self-start w-full max-w-[95%]"
      >
        <LandingConversationCueToast cue={cue} />
      </motion.div>
      <div className="self-end max-w-[78%]">
        <div className="bg-primary text-primary-foreground text-xs font-medium px-3.5 py-2.5 rounded-2xl rounded-br-sm">
          Hey! Just matched with you 👋
        </div>
      </div>
      <div className="self-start max-w-[78%]">
        <div className="bg-muted border border-border landing-muted text-xs px-3.5 py-2.5 rounded-2xl rounded-bl-sm">
          Hey! Up for a chat after we matched?
        </div>
      </div>
      <div className="self-end max-w-[78%]">
        <div className="bg-primary text-primary-foreground text-xs font-medium px-3.5 py-2.5 rounded-2xl rounded-br-sm">
          Always 🔥 want to play a round?
        </div>
      </div>
      {/* typing indicator */}
      <div className="self-start flex items-center gap-1.5 bg-muted border border-border px-3.5 py-2.5 rounded-2xl rounded-bl-sm w-fit">
        {lite
          ? [0, 1, 2].map((k) => <div key={k} className="size-1.5 rounded-full bg-foreground/40" />)
          : [0, 0.15, 0.3].map((d) => (
              <motion.div key={d} className="size-1.5 rounded-full bg-foreground/40" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: d }} />
            ))}
      </div>
      {/* input */}
      <div className="mt-1 flex items-center gap-2 rounded-xl bg-muted/80 border border-border px-3 py-2.5">
        <p className="text-[11px] landing-muted flex-1">Type a message…</p>
        <div className="size-6 rounded-lg bg-[oklch(88%_0.18_105/0.15)] flex items-center justify-center">
          <Send className="size-3 landing-gold-text-muted" />
        </div>
      </div>
    </div>
  );
}

function VideoMockup() {
  const { lite } = useLandingPerf();
  return (
    <div className="relative flex flex-col p-4 gap-3">
      {/* remote video */}
      <div className="relative rounded-2xl bg-muted border border-border overflow-hidden aspect-video flex items-center justify-center">
        <div className="absolute inset-0 landing-mockup-panel" />
        <div className="relative flex flex-col items-center gap-2">
          <div className="size-12 rounded-full bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center text-base font-bold text-white">M</div>
          <p className="text-xs landing-muted">Maya L. · connected</p>
        </div>
        {/* local pip */}
        <div className="absolute bottom-2 right-2 w-16 h-20 rounded-xl landing-mockup-panel border border-border flex items-center justify-center">
          <div className="size-8 rounded-full bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">Y</div>
        </div>
        {/* live badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/50 md:backdrop-blur-sm rounded-full px-2 py-0.5">
          {lite ? (
            <div className="size-1.5 rounded-full bg-red-500" />
          ) : (
            <motion.div className="size-1.5 rounded-full bg-red-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
          )}
          <span className="text-[10px] landing-muted font-medium">LIVE</span>
        </div>
      </div>
      {/* controls */}
      <div className="flex justify-center gap-3">
        {[
          { icon: MicOff,  bg: "bg-muted border border-border",                         color: "landing-muted" },
          { icon: Video,   bg: "bg-muted border border-border",                         color: "landing-muted" },
          { icon: PhoneOff,bg: "bg-red-500/90",                                              color: "text-white"    },
        ].map(({ icon: Icon, bg, color }, i) =>
          lite ? (
            <div key={i} className={cn("size-10 rounded-full flex items-center justify-center cursor-default", bg)}>
              <Icon className={cn("size-4", color)} />
            </div>
          ) : (
            <motion.div key={i} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} className={cn("size-10 rounded-full flex items-center justify-center cursor-default", bg)}>
              <Icon className={cn("size-4", color)} />
            </motion.div>
          ),
        )}
      </div>
    </div>
  );
}

function VoiceMockup() {
  const { lite } = useLandingPerf();
  return (
    <div className="flex flex-col items-center gap-5 p-6 py-8">
      {/* avatar with pulse */}
      <div className="relative">
        {lite
          ? null
          : [0, 0.4, 0.8].map((d, i) => (
              <motion.div key={i} className="absolute inset-0 rounded-full border border-[oklch(88%_0.18_105/0.3)]" animate={{ scale: [1, 1.6 + i * 0.2], opacity: [0.5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: d }} />
            ))}
        <div className="relative size-20 rounded-full bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-violet-500/20">
          N
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold landing-card-title">Noah K.</p>
        <div className="flex items-center gap-1.5 justify-center mt-1">
          {lite ? (
            <div className="size-1.5 rounded-full bg-emerald-400" />
          ) : (
            <motion.div className="size-1.5 rounded-full bg-emerald-400" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
          )}
          <p className="text-[11px] text-emerald-400">Voice call · 2:34</p>
        </div>
      </div>
      {/* voice wave */}
      <div className="flex items-center gap-1">
        {WAVE_BARS.map((bar, i) =>
          lite ? (
            <div key={i} className={cn("w-1 rounded-full bg-[oklch(88%_0.18_105/0.6)]", bar.heightClass)} />
          ) : (
            <motion.div key={i} className="w-1 rounded-full bg-[oklch(88%_0.18_105/0.6)]" animate={{ height: [4, bar.peak, 4] }} transition={{ duration: bar.duration, repeat: Infinity, ease: "easeInOut", delay: i * 0.06 }} />
          ),
        )}
      </div>
      {/* controls */}
      <div className="flex justify-center gap-3 mt-1">
        {[
          { icon: MicOff,   bg: "bg-muted border border-border", color: "landing-muted" },
          { icon: PhoneOff, bg: "bg-red-500/90",                     color: "text-white"    },
          { icon: Volume2,  bg: "bg-muted border border-border", color: "landing-muted" },
        ].map(({ icon: Icon, bg, color }, i) =>
          lite ? (
            <div key={i} className={cn("size-10 rounded-full flex items-center justify-center cursor-default", bg)}>
              <Icon className={cn("size-4", color)} />
            </div>
          ) : (
            <motion.div key={i} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} className={cn("size-10 rounded-full flex items-center justify-center cursor-default", bg)}>
              <Icon className={cn("size-4", color)} />
            </motion.div>
          ),
        )}
      </div>
    </div>
  );
}

/* ─── Ambient (skip on narrow screens — largest scroll/composite win on phones) ─ */
function AmbientBackdrop() {
  const { isMobile, lite } = useLandingPerf();

  if (isMobile) return null;

  if (lite) {
    return (
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[oklch(88%_0.18_105/0.06)] blur-[72px]" />
        <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full bg-[oklch(65%_0.2_285/0.07)] blur-[64px]" />
        <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full bg-[oklch(88%_0.18_105/0.05)] blur-[64px]" />
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <motion.div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[oklch(88%_0.18_105/0.05)] blur-[120px]" animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full bg-[oklch(65%_0.2_285/0.06)] blur-[100px]" animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }} />
      <motion.div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full bg-[oklch(88%_0.18_105/0.04)] blur-[100px]" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }} />
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
function LandingPageInner() {
  const { lite } = useLandingPerf();
  const [activeTab, setActiveTab] = useState<CommTab>("chat");
  const { navPrimaryHref, navPrimaryLabel, appHref } = useLandingEntryCta();

  return (
    <>
      <AmbientBackdrop />

      {/* ══════════════════ ACTIVITIES ══════════════════ */}
      <RevealSection className="mx-5 sm:mx-6 lg:mx-auto max-w-7xl mt-8 sm:mt-12 lg:mt-14">
        <motion.div
          variants={fadeUp}
          className="rounded-3xl border border-border bg-card px-5 sm:px-8 lg:px-10 py-8 sm:py-10 text-center"
        >
          <Badge
            variant="outline"
            className="landing-section-badge rounded-full mb-4 sm:mb-5 tracking-widest uppercase text-[10px]"
          >
            Match by activity
          </Badge>
          <h2 className="text-xl sm:text-3xl font-black tracking-tight leading-tight mb-3 sm:mb-4">
            Do something together from the first hello
          </h2>
          <p className="text-sm sm:text-base landing-muted max-w-2xl mx-auto mb-6 sm:mb-7">
            Pick an activity when you match — vent, yap, practice language, validate startup ideas, and more — not just small talk.
          </p>
          <LandingActivityChips
            items={LANDING_SESSION_ACTIVITIES}
            size="sm"
            className="justify-center gap-2 sm:gap-2.5 max-w-3xl mx-auto"
          />
        </motion.div>
      </RevealSection>

      {/* ══════════════════ FEATURES ══════════════════ */}
      <section className="relative py-12 sm:py-20 lg:py-32 px-5 sm:px-6" id="features">
        <RevealSection className="mx-auto max-w-7xl">
          <motion.div variants={fadeUp} className="text-center mb-8 sm:mb-12 lg:mb-16">
            <Badge variant="outline" className="landing-section-badge rounded-full mb-3 sm:mb-5 tracking-widest uppercase text-[10px]">
              Everything you need
            </Badge>
            <h2 className="text-[1.75rem] sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">Built for real connection</h2>
            <p className="mt-3 sm:mt-4 text-sm sm:text-base landing-muted max-w-lg mx-auto">Every feature exists for one reason: to help you meet people who feel like people, not profiles.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {FEATURES.map(({ icon: Icon, label, desc, tint, iconClass }) => (
              <motion.div key={label} variants={cardIn} whileHover={lite ? undefined : { y: -6, transition: { duration: 0.25 } }}>
                <Card className="relative overflow-hidden border-border bg-card h-full shadow-xl p-0 gap-0">
                  <div className={`absolute inset-0 bg-linear-to-br ${tint} opacity-60 pointer-events-none`} />
                  <CardContent className="relative p-4 sm:p-6 flex flex-col gap-3 sm:gap-4">
                    <div className={cn("size-11 rounded-2xl border flex items-center justify-center", iconClass)}>
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="font-bold text-base landing-card-title mb-1.5">{label}</p>
                      <p className="text-sm landing-muted leading-relaxed">{desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </RevealSection>
      </section>

      {/* ══════════════════ MATCHING CONTROL ══════════════════ */}
      <section className="relative py-12 sm:py-20 lg:py-24 px-5 sm:px-6 bg-background">
        <RevealSection className="mx-auto max-w-7xl">
          <motion.div variants={fadeUp} className="text-center mb-8 sm:mb-12 lg:mb-14">
            <Badge variant="outline" className="landing-section-badge rounded-full mb-3 sm:mb-5 tracking-widest uppercase text-[10px]">
              Match exactly how you want
            </Badge>
            <h2 className="text-[1.75rem] sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">Find your people with real control</h2>
            <p className="mt-3 sm:mt-4 text-sm sm:text-base landing-muted max-w-2xl mx-auto">
              Match by activity, profession, location, or person type — chess, vent, yap, nearby friends,
              city-level networking, or global spaces.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-5">
            {MATCHING_SIGNALS.map(({ icon: Icon, title, desc }) => (
              <motion.div key={title} variants={cardIn}>
                <Card className="border-border bg-card h-full shadow-xl p-0 gap-0">
                  <CardContent className="p-4 sm:p-6 flex flex-col gap-3 sm:gap-4">
                    <div className="size-10 rounded-xl landing-gold-icon-box border flex items-center justify-center">
                      <Icon className="size-4 landing-gold-text" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold landing-card-title mb-1.5">{title}</p>
                      <p className="text-xs landing-muted leading-relaxed">{desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </RevealSection>
      </section>

      {/* ══════════════════ SAFETY BANNER ══════════════════ */}
      <RevealSection className="mx-5 sm:mx-6 lg:mx-auto max-w-7xl py-2 sm:py-4">
        <motion.div
          variants={fadeIn}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 rounded-2xl border border-border bg-card px-4 sm:px-7 py-4 sm:py-5"
        >
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="size-10 rounded-xl landing-gold-icon-box border flex items-center justify-center shrink-0">
              <ShieldCheck className="size-5 landing-gold-text" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold landing-card-title">A space you can actually feel comfortable in</p>
              <p className="text-xs landing-muted mt-0.5 max-w-lg">
                We scan video for NSFW content, keep calls secure, and enforce community guidelines — so you can focus on
                the conversation, not worrying about who&apos;s on the other side.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 w-full sm:w-auto">
            {[
              { icon: ShieldCheck, label: "NSFW detection" },
              { icon: Shield,      label: "Secure calls" },
              { icon: Users,       label: "Real community"  },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs landing-muted">
                <Icon className="size-3.5 landing-gold-text-muted" />
                {label}
              </div>
            ))}
          </div>
        </motion.div>
      </RevealSection>

      {/* ══════════════════ CONVERSATION CUES ══════════════════ */}
      <section className="relative py-12 sm:py-20 lg:py-28 px-5 sm:px-6 bg-background overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[420px] h-[420px] rounded-full bg-primary/5 blur-[80px] md:blur-[120px]" />
        </div>

        <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
          <RevealSection className="order-2 lg:order-1 w-full">
            <LandingCuesDemo />
          </RevealSection>

          <RevealSection className="order-1 lg:order-2 w-full">
            <motion.div variants={fadeUp} className="mb-3 sm:mb-5">
              <Badge variant="outline" className="landing-section-badge rounded-full tracking-widest uppercase text-[10px]">
                Conversation cues
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-[1.75rem] sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-4 sm:mb-5">
              Never stuck on<br />
              <span className="landing-gold-gradient">what to say first.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-sm sm:text-base landing-muted leading-relaxed max-w-lg mb-6 sm:mb-8">
              During a 1:1 call, Greetup shows one or two short hints — shared activities, what they picked,
              or overlapping interests — so you are not staring at a blank screen.
            </motion.p>
            <motion.div variants={stagger} className="flex flex-col gap-3 sm:gap-4 w-full">
              {LANDING_CONVERSATION_CUE_EXAMPLES.map((cue) => (
                <motion.div key={cue.title} variants={cardIn} className="w-full">
                  <LandingConversationCueToast cue={cue} />
                </motion.div>
              ))}
            </motion.div>
          </RevealSection>
        </div>
      </section>

      {/* ══════════════════ CONNECT INSTANTLY (Chat / Video / Voice) ══════════════════ */}
      <section className="relative py-12 sm:py-20 lg:py-28 px-5 sm:px-6 bg-background overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-end pr-0">
          <div className="w-[400px] h-[400px] rounded-full bg-[oklch(88%_0.18_105/0.05)] blur-[48px] md:blur-[100px]" />
        </div>

        <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
          {/* copy */}
          <RevealSection className="order-1 lg:order-none">
            <motion.div variants={fadeUp} className="mb-3 sm:mb-5">
              <Badge variant="outline" className="landing-section-badge rounded-full tracking-widest uppercase text-[10px]">
                Real-time networking
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-[1.75rem] sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-4 sm:mb-5">
              Chat. Call. Video.<br />
              <span className="landing-gold-gradient">
                Right when you match.
              </span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-sm sm:text-base landing-muted leading-relaxed max-w-md mb-6 sm:mb-10">
              Once you match, move instantly between text, voice, and video — or launch chess right in the call.
              Start 1:1, bring in your friends, or continue inside a public or private space.
            </motion.p>
            <motion.div variants={stagger} className="flex flex-col gap-3 sm:gap-4">
              {[
                { icon: Sparkles, color: "text-secondary bg-secondary/10 border-secondary/20", title: "In-call activities", desc: "Play chess together on a video call — vent, yap, and more activities when you match." },
                { icon: MessageCircle, color: "text-sky-400 bg-sky-400/10 border-sky-400/20", title: "Instant chat", desc: "Real-time messaging plus conversation cues when you need a nudge to break the ice." },
                { icon: Phone, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", title: "Voice calls", desc: "Jump into audio to network quickly with people who share your niche." },
                { icon: Video, color: "text-violet-400 bg-violet-400/10 border-violet-400/20", title: "Video calls", desc: "Use face-to-face calls for stronger chemistry and deeper conversations." },
              ].map(({ icon: Icon, color, title, desc }) => (
                <motion.div key={title} variants={cardIn} className="flex items-start gap-4">
                  <div className={cn("size-10 rounded-xl border flex items-center justify-center shrink-0", color)}>
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold landing-card-title">{title}</p>
                    <p className="text-xs landing-muted mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </RevealSection>

          {/* interactive tab mockup */}
          <RevealSection className="order-2 lg:order-none flex justify-center lg:justify-end">
            <motion.div variants={fadeUp} className="relative w-full max-w-xs sm:max-w-sm">
              <Card className="border-border bg-card overflow-hidden shadow-2xl shadow-foreground/10 p-0 gap-0">
                {/* header */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                  <div className="size-8 rounded-full bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">S</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold landing-card-title leading-none">Sofia L.</p>
                    <p className="text-[10px] landing-muted mt-0.5">Just matched · Software Engineering · Music</p>
                  </div>
                  <div className="size-2 rounded-full bg-emerald-400" />
                </div>

                {/* tab switcher */}
                <div className="flex border-b border-border">
                  {COMM_TABS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-semibold transition-all",
                        activeTab === id
                          ? "landing-tab-active border-b-2"
                          : "landing-muted hover:text-foreground/70 border-b-2 border-transparent"
                      )}
                    >
                      <Icon className="size-3" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* tab content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: EASE }}
                  >
                    {activeTab === "chat"  && <ChatMockup />}
                    {activeTab === "video" && <VideoMockup />}
                    {activeTab === "voice" && <VoiceMockup />}
                  </motion.div>
                </AnimatePresence>
              </Card>

              <div className="absolute -bottom-2 sm:-bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-10 bg-[oklch(88%_0.18_105/0.1)] blur-lg md:blur-2xl rounded-full" />
            </motion.div>
          </RevealSection>
        </div>
      </section>

      {/* ══════════════════ SPACES IN ACTION ══════════════════ */}
      <section className="relative py-12 sm:py-20 lg:py-28 px-5 sm:px-6 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-start pl-0">
          <div className="w-[400px] h-[400px] rounded-full bg-[oklch(65%_0.2_285/0.05)] blur-[48px] md:blur-[100px]" />
        </div>

        <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
          {/* copy first on mobile */}
          <RevealSection className="order-1 lg:order-1">
            <motion.div variants={fadeUp} className="mb-3 sm:mb-5">
              <Badge variant="outline" className="landing-section-badge rounded-full tracking-widest uppercase text-[10px]">
                Spaces that feel alive
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-[1.75rem] sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-4 sm:mb-6">
              Discuss your niche.<br />
              <span className="landing-gold-gradient">Build your network in spaces.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-sm sm:text-base landing-muted leading-relaxed max-w-md mb-5 sm:mb-8">
              Spaces are group rooms built around shared interests. Join rooms like Startup Founder Night Talk,
              Jam Session for Musicians, chess rooms, Watch Together, draw together, study together, debate rooms,
              truth or dare, music rooms, and live polls, then move to 1:1 when you click.
            </motion.p>
            <motion.div variants={stagger} className="flex flex-col gap-3 sm:gap-4">
              {[
                { icon: Users, text: "Public and private spaces for open communities or close trusted groups" },
                { icon: MessageCircle, text: "Move from space chat to 1:1 when you find someone you click with" },
                { icon: Lightbulb, text: "Conversation cues in 1:1 calls — shared activities, interests, and gentle openers when you match." },
                { icon: Wind, text: "Invite your friend into the conversation and grow your network naturally" },
              ].map(({ icon: Icon, text }) => (
                <motion.div key={text} variants={cardIn} className="flex items-start gap-3">
                  <div className="size-7 rounded-lg bg-muted/80 border border-border flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="size-3.5 landing-gold-text" />
                  </div>
                  <p className="text-sm landing-muted leading-relaxed">{text}</p>
                </motion.div>
              ))}
            </motion.div>
          </RevealSection>

          {/* visual below copy on mobile */}
          <RevealSection className="order-2 lg:order-2 flex justify-center">
            <motion.div variants={fadeUp} className="relative w-full max-w-xs sm:max-w-sm">
              <Card className="border-border bg-card overflow-hidden shadow-2xl shadow-foreground/10 p-0 gap-0">
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                  <div className="size-8 rounded-full bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">L</div>
                  <div>
                    <p className="text-xs font-semibold landing-card-title leading-none">Leo B.</p>
                    <p className="text-[10px] landing-muted mt-0.5">Group room · Startup Founder Night Talk</p>
                  </div>
                  <div className="ml-auto size-2 rounded-full bg-emerald-400" />
                </div>
                <div className="px-4 py-4 flex flex-col gap-2.5 min-h-[130px]">
                  <div className="self-end bg-primary text-primary-foreground text-xs font-medium px-3 py-2 rounded-2xl rounded-br-sm max-w-[76%]">We are hosting a networking room now 👋</div>
                  <div className="self-start bg-muted border border-border landing-muted text-xs px-3 py-2 rounded-2xl rounded-bl-sm max-w-[76%]">Nice, invite me. I can bring one friend too.</div>
                </div>
                <Separator className="bg-muted" />
                <div className="px-4 pb-3 pt-3">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <div className="size-4 rounded-md bg-[oklch(88%_0.18_105/0.12)] flex items-center justify-center">
                      <Lightbulb className="size-2.5 landing-gold-text" />
                    </div>
                    <p className="text-[10px] landing-gold-text-muted font-semibold tracking-wide uppercase">Group room examples</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SPACE_ACTIVITY_CHIPS.map((chip, i) => {
                      const chipLabel = chip.comingSoon ? `${chip.label} · Soon` : chip.label;
                      const chipClass = cn(
                        "text-[10px] font-medium px-2.5 py-1 rounded-full border transition-all cursor-default",
                        chip.comingSoon
                          ? "border-border bg-muted/60 landing-muted"
                          : "border-[oklch(88%_0.18_105/0.25)] bg-[oklch(88%_0.18_105/0.07)] landing-muted hover:border-[oklch(88%_0.18_105/0.5)] hover:text-foreground",
                      );
                      return lite ? (
                        <button key={chip.label} type="button" className={chipClass}>
                          {chipLabel}
                        </button>
                      ) : (
                        <motion.button
                          key={chip.label}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + i * 0.12, duration: 0.35, ease: EASE }}
                          className={chipClass}
                        >
                          {chipLabel}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
                <div className="mx-4 mb-4 flex items-center gap-2 rounded-xl bg-muted/80 border border-border px-3 py-2.5">
                  <p className="text-[11px] landing-muted flex-1">Type a message…</p>
                  <div className="size-6 rounded-lg bg-[oklch(88%_0.18_105/0.15)] flex items-center justify-center"><Send className="size-3 landing-gold-text-muted" /></div>
                </div>
              </Card>
              <div className="absolute -bottom-2 sm:-bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-10 bg-[oklch(88%_0.18_105/0.1)] blur-lg md:blur-2xl rounded-full" />
            </motion.div>
          </RevealSection>
        </div>
      </section>

      {/* ══════════════════ LIVE STREAMS ══════════════════ */}
      <section className="relative py-12 sm:py-20 lg:py-24 px-5 sm:px-6 bg-background">
        <RevealSection className="mx-auto max-w-7xl">
          <motion.div variants={fadeUp} className="text-center mb-8 sm:mb-12">
            <Badge variant="outline" className="landing-section-badge rounded-full mb-3 sm:mb-5 tracking-widest uppercase text-[10px]">
              Live with your connections
            </Badge>
            <h2 className="text-[1.75rem] sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">Go live from your matches and spaces</h2>
            <p className="mt-3 sm:mt-4 text-sm sm:text-base landing-muted max-w-2xl mx-auto">
              Turn any active match or space conversation into a live session in one tap, then stream out to platforms like YouTube from the same flow. Coming soon.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3 mb-5 sm:mb-8">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-border bg-muted landing-muted px-5 cursor-default"
              disabled
            >
              Start live session · Coming soon
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-border bg-muted landing-muted hover:bg-muted hover:text-foreground px-5"
              asChild
            >
              <Link href={appHref}>Open your connections</Link>
            </Button>
          </motion.div>
          <motion.p variants={fadeUp} className="text-center text-xs landing-muted mb-4 sm:mb-6">
            Live room size stays intimate: up to 15 people per room, with multi-platform streaming to YouTube and more.
          </motion.p>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
            {LIVE_STREAM_EXAMPLES.map((stream) => (
              <motion.div key={stream.title} variants={cardIn}>
                <Card className="border-border bg-card shadow-xl p-0 gap-0">
                  <CardContent className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-base font-bold landing-card-title leading-tight">{stream.title}</p>
                        <p className="text-xs landing-muted mt-1">{stream.topic}</p>
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-1 text-[10px] font-semibold landing-muted">
                        Example
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-8 rounded-full landing-gold-icon-box border flex items-center justify-center text-xs font-bold landing-gold-text shrink-0">
                        {stream.category.slice(0, 1)}
                      </div>
                      <p className="text-[11px] landing-muted truncate">{stream.category}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[10px] landing-muted">
                        <Users className="size-3" />
                        Room idea
                      </div>
                      <Button size="sm" variant="outline" className="rounded-full border-border bg-muted landing-muted px-4 cursor-default" disabled>
                        Go live · Soon
                      </Button>
                    </div>
                    <p className="text-[10px] landing-muted">
                      Planned streaming: {stream.platforms.join(" · ")}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </RevealSection>
      </section>

      {/* ══════════════════ HOW IT WORKS ══════════════════ */}
      <section className="relative py-12 sm:py-20 lg:py-24 px-5 sm:px-6 bg-background" id="how-it-works">
        <RevealSection className="mx-auto max-w-5xl">
          <motion.div variants={fadeUp} className="text-center mb-8 sm:mb-12 lg:mb-16">
            <Badge variant="outline" className="landing-section-badge rounded-full mb-3 sm:mb-5 tracking-widest uppercase text-[10px]">
              The process
            </Badge>
            <h2 className="text-[1.75rem] sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">Three steps to<br />finding your tribe</h2>
          </motion.div>

          <div className="relative grid md:grid-cols-3 gap-6 sm:gap-8">
            <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-px bg-linear-to-r from-transparent via-[oklch(88%_0.18_105/0.3)] to-transparent" />
            {STEPS.map((step, i) => (
              <motion.div key={step.n} variants={cardIn} className="relative flex flex-col items-center text-center gap-4 sm:gap-5">
                <div className="relative">
                  <div className="size-16 sm:size-20 rounded-full border landing-step-ring-border bg-card flex items-center justify-center">
                    <span className="text-xl sm:text-2xl font-black landing-gold-text">{step.n}</span>
                  </div>
                  {!lite && <StepRippleRings stepIndex={i} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold landing-card-title mb-2">{step.title}</h3>
                  <p className="text-sm landing-muted leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </RevealSection>
      </section>

      {/* ══════════════════ TRUST ══════════════════ */}
      <div className="py-8 sm:py-12 px-5 sm:px-6 border-y border-border bg-background">
        <RevealSection className="mx-auto max-w-4xl flex flex-wrap items-center justify-center gap-x-8 sm:gap-x-12 gap-y-4 sm:gap-y-5">
          {TRUST.map(({ icon: Icon, label }) => (
            <motion.div key={label} variants={fadeIn} className="flex items-center gap-2 text-sm font-medium landing-muted">
              <Icon className="size-4 landing-gold-text-muted" />
              {label}
            </motion.div>
          ))}
        </RevealSection>
      </div>

      {/* ══════════════════ FINAL CTA ══════════════════ */}
      <section className="relative py-14 sm:py-24 lg:py-36 px-5 sm:px-6 overflow-hidden" id="join">
        {lite ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
            <div className="w-[min(100vw,700px)] h-[min(100vw,700px)] rounded-full bg-[oklch(88%_0.18_105/0.07)] blur-[64px] md:blur-[130px]" />
          </div>
        ) : (
          <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none" animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
            <div className="w-[700px] h-[700px] rounded-full bg-[oklch(88%_0.18_105/0.07)] blur-[130px]" />
          </motion.div>
        )}

        <RevealSection className="relative mx-auto max-w-3xl text-center">
          <motion.div variants={fadeUp} className="mb-5 sm:mb-8">
            <Badge variant="outline" className="border-border bg-muted/80 landing-muted md:backdrop-blur-sm rounded-full px-4 py-1.5 text-xs gap-2">
              {EARLY_RELEASE.badge}
            </Badge>
          </motion.div>

          <motion.h2 variants={fadeUp} className="text-[1.85rem] sm:text-5xl lg:text-7xl font-black tracking-tight leading-tight mb-4 sm:mb-6">
            Your people.<br />
            <span className="landing-gold-gradient">
              Your spaces.
            </span>
          </motion.h2>

          <motion.p variants={fadeUp} className="text-sm sm:text-lg landing-muted mb-8 sm:mb-12 max-w-xl mx-auto">
            Match for chess, vent, yap, or any activity — join spaces, find your people, and connect in real time
            from nearby to global communities.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col items-center gap-3 sm:gap-4">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="inline-block">
              <Button
                size="lg"
                className="rounded-full bg-primary text-primary-foreground hover:brightness-110 shadow-2xl shadow-primary/35 font-black text-base px-10 py-6"
                asChild
              >
                <Link href={navPrimaryHref}>
                  {navPrimaryLabel}{" "}
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          <motion.p variants={fadeUp} className="mt-6 text-xs landing-muted">
            No credit card. No algorithm that sells you ads. Just people.
          </motion.p>
        </RevealSection>
      </section>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer className="border-t border-border bg-background px-5 sm:px-6 py-8 sm:py-12">
        <RevealSection className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <motion.div variants={fadeIn}><Logo /></motion.div>
          <motion.div variants={stagger} className="flex flex-wrap justify-center gap-x-1 gap-y-1">
            {FOOTER_LINKS.map(({ label, href }) => (
              <motion.div key={href} variants={fadeIn}>
                <Button variant="ghost" size="sm" className="landing-muted hover:text-foreground hover:bg-muted text-xs rounded-full" asChild>
                  <Link href={href}>{label}</Link>
                </Button>
              </motion.div>
            ))}
          </motion.div>
          <motion.p variants={fadeIn} className="text-xs landing-muted">© 2026 Greetup. All rights reserved.</motion.p>
        </RevealSection>
      </footer>
    </>
  );
}

export function LandingPageView() {
  return (
    <LandingPerfProvider>
      <LandingPageInner />
    </LandingPerfProvider>
  );
}
