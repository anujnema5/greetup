"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  AnimatePresence,
  useReducedMotion,
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
  Gamepad2,
  MessageCircle,
  ArrowRight,
  ChevronRight,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";
import { EARLY_RELEASE } from "@/lib/copy/user-messages";
import { HeroMatchDemo } from "./hero-match-demo";

/* Mobile / reduced-motion: drop scroll-linked nav, fixed blur layers, and looping animations */
type LandingPerfValue = { isMobile: boolean; lite: boolean };
const LandingPerfContext = createContext<LandingPerfValue>({ isMobile: false, lite: false });

function useLandingPerf() {
  return useContext(LandingPerfContext);
}

function LandingPerfProvider({ children }: { children: React.ReactNode }) {
  const prefersReduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useLayoutEffect(() => {
    const mq = globalThis.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const lite = Boolean(prefersReduced) || isMobile;
  const value = useMemo(() => ({ isMobile, lite }), [isMobile, lite]);

  return <LandingPerfContext.Provider value={value}>{children}</LandingPerfContext.Provider>;
}

/* ─── easing ────────────────────────────────────────────────────────────────── */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* precomputed so VoiceMockup stays a pure render function */
const WAVE_BARS = Array.from({ length: 12 }, () => ({
  height: Math.random() * 20 + 8,
  duration: 0.5 + Math.random() * 0.4,
}));

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
    icon: Zap,
    label: "Precision Matching",
    desc: "Match in real time by profession, interests, and the kind of person you actually want to connect with.",
    tint: "from-amber-400/15 to-transparent",
    iconClass: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  },
  {
    icon: Users,
    label: "Circles",
    desc: "Circles are group rooms where people meet around shared interests and talk live.",
    tint: "from-violet-400/15 to-transparent",
    iconClass: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  },
  {
    icon: Gamepad2,
    label: "Activities Together (Coming soon)",
    desc: "Do activities together like chess, Watch Together (YouTube), draw together, study together, debate, truth or dare, music rooms, and live polls.",
    tint: "from-emerald-400/15 to-transparent",
    iconClass: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  {
    icon: MessageCircle,
    label: "Instant Connect",
    desc: "Chat, voice, and video instantly. Invite trusted friends into private circles or keep it 1:1.",
    tint: "from-sky-400/15 to-transparent",
    iconClass: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  },
];

const MATCHING_SIGNALS = [
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
    desc: "Connect nearby, in your city, across your country, or globally when you want a wider circle.",
  },
  {
    icon: Globe,
    title: "In real time",
    desc: "Matching updates live, so new relevant people and circles appear as soon as they are active.",
  },
];

const COMM_TABS = [
  { id: "chat",  label: "Chat",       icon: MessageCircle },
  { id: "video", label: "Video call", icon: Video          },
  { id: "voice", label: "Voice call", icon: Phone          },
] as const;
type CommTab = (typeof COMM_TABS)[number]["id"];

const STEPS = [
  { n: "01", title: "Set your preferences", desc: "Answer a few quick questions about your interests, goals, and the kind of connections you want." },
  { n: "02", title: "Get matched", desc: "Our engine finds people with real alignment, not just the same city, but the same wavelength." },
  { n: "03", title: "Connect & grow", desc: "Chat, call, join activities, or hop into a circle together. Build real relationships naturally." },
];

const BETA_HIGHLIGHTS = [
  { value: "Beta", label: "Early access" },
  { value: "Free", label: "To join" },
  { value: "1:1", label: "Match & video" },
  { value: "Live", label: "Circles & chat" },
];

const TRUST = [
  { icon: Shield,      label: "Privacy first"       },
  { icon: Globe,       label: "Nearby or global"     },
  { icon: Zap,         label: "Real-time matching"  },
  { icon: Users,       label: "Early community"     },
  { icon: ShieldCheck, label: "Safe & inclusive"    },
];

const CIRCLE_ACTIVITY_CHIPS: ReadonlyArray<{ label: string; comingSoon?: boolean }> = [
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
const STEP_RING_CYCLE_S = 3;

function StepRippleRings({ stepIndex }: { stepIndex: number }) {
  return (
    <>
      {Array.from({ length: STEP_RING_COUNT }, (_, ri) => (
        <div
          key={ri}
          className="landing-step-ring pointer-events-none absolute inset-0 rounded-full border border-[oklch(88%_0.11_105/0.28)]"
          style={{
            animationDelay: `${stepIndex * 0.2 + (ri * STEP_RING_CYCLE_S) / STEP_RING_COUNT}s`,
          }}
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
    title: "Creative writing circle",
    topic: "Poetry prompts and short reading sessions",
    category: "Writing",
    platforms: ["YouTube", "Twitch"],
  },
];

/* ─── Navbar ─────────────────────────────────────────────────────────────────── */
function NavbarInner({
  isLoggedIn,
  firstName,
  lite,
}: {
  isLoggedIn: boolean;
  firstName: string;
  lite: boolean;
}) {
  const cta = (
    <Button
      size="sm"
      className="rounded-full bg-[oklch(88%_0.11_105)] text-[oklch(15%_0.02_110)] hover:brightness-110 shadow-lg shadow-[oklch(88%_0.11_105/0.3)] font-semibold"
      asChild
    >
      <Link href={isLoggedIn ? "/home" : "/register"}>
        {isLoggedIn ? "Go to home" : "Get started"} <ChevronRight className="size-3.5" />
      </Link>
    </Button>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
      {lite ? (
        <div>
          <Logo />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: EASE }}>
          <Logo />
        </motion.div>
      )}
      {lite ? (
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <span className="hidden sm:inline-flex rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-medium text-white/80">
              Hi, {firstName || "there"}
            </span>
          ) : (
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-white/65 hover:text-white hover:bg-white/6 rounded-full" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          )}
          {cta}
        </div>
      ) : (
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
        >
          {isLoggedIn ? (
            <span className="hidden sm:inline-flex rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-medium text-white/80">
              Hi, {firstName || "there"}
            </span>
          ) : (
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-white/65 hover:text-white hover:bg-white/6 rounded-full" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          )}
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
            {cta}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function NavbarScroll({
  isLoggedIn,
  firstName,
}: {
  isLoggedIn: boolean;
  firstName: string;
}) {
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 60], ["rgba(0,0,0,0)", "rgba(18,18,20,0.88)"]);
  const shadow = useTransform(scrollY, [0, 60], ["0 0 0 rgba(0,0,0,0)", "0 8px 32px rgba(0,0,0,0.28)"]);

  return (
    <motion.nav
      style={{ backgroundColor: bg, boxShadow: shadow }}
      className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl border-b border-white/4"
    >
      <NavbarInner isLoggedIn={isLoggedIn} firstName={firstName} lite={false} />
    </motion.nav>
  );
}

function Navbar({
  isLoggedIn,
  firstName,
}: {
  isLoggedIn: boolean;
  firstName: string;
}) {
  const { lite } = useLandingPerf();

  if (lite) {
    return (
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/8 bg-[oklch(16%_0.012_110/0.94)] supports-[backdrop-filter]:bg-[oklch(16%_0.012_110/0.88)] md:supports-[backdrop-filter]:backdrop-blur-md">
        <NavbarInner isLoggedIn={isLoggedIn} firstName={firstName} lite />
      </nav>
    );
  }

  return <NavbarScroll isLoggedIn={isLoggedIn} firstName={firstName} />;
}

/* ─── Hero visual ────────────────────────────────────────────────────────────── */
function HeroBackdrop() {
  const { lite } = useLandingPerf();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_-10%,oklch(22%_0.025_105/0.55),transparent_72%)]" />

      {lite ? (
        <>
          <div className="absolute -top-28 -left-36 h-[400px] w-[400px] rounded-full bg-[oklch(88%_0.11_105/0.06)] blur-[96px]" />
          <div className="absolute top-[16%] -right-20 h-[340px] w-[340px] rounded-full bg-[oklch(88%_0.11_105/0.09)] blur-[88px]" />
          <div className="absolute bottom-[8%] left-[22%] h-[260px] w-[260px] rounded-full bg-[oklch(62%_0.14_285/0.05)] blur-[72px]" />
        </>
      ) : (
        <>
          <motion.div
            className="absolute -top-28 -left-36 h-[400px] w-[400px] rounded-full bg-[oklch(88%_0.11_105/0.07)] blur-[96px]"
            animate={{ opacity: [0.55, 0.85, 0.55], scale: [1, 1.06, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-[16%] -right-20 h-[340px] w-[340px] rounded-full bg-[oklch(88%_0.11_105/0.1)] blur-[88px]"
            animate={{ opacity: [0.6, 0.95, 0.6], scale: [1, 1.08, 1] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          />
          <motion.div
            className="absolute bottom-[8%] left-[22%] h-[260px] w-[260px] rounded-full bg-[oklch(62%_0.14_285/0.06)] blur-[72px]"
            animate={{ opacity: [0.45, 0.75, 0.45], scale: [1, 1.1, 1] }}
            transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          />
        </>
      )}

      <div
        className="absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_88%_82%_at_68%_50%,#000_28%,transparent_80%)]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, oklch(100% 0 0 / 0.055) 1px, transparent 0)",
          backgroundSize: "30px 30px",
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_58%_at_84%_44%,oklch(88%_0.11_105/0.11),transparent_72%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_38%_42%_at_14%_32%,oklch(88%_0.11_105/0.045),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_100%_at_50%_50%,transparent_44%,#0A0A0A_94%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/8 to-transparent" />
    </div>
  );
}

const HERO_SIGNALS = [
  { icon: Users, label: "1:1 matching" },
  { icon: Globe, label: "Nearby or global" },
  { icon: MessageCircle, label: "Chat & video" },
] as const;

function HeroVisual() {
  const { lite } = useLandingPerf();

  return (
    <div className="relative w-full max-w-[380px] sm:max-w-[420px] lg:max-w-[440px] mx-auto lg:mx-0 lg:ml-auto select-none pointer-events-none">
      <div
        className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-[radial-gradient(circle,oklch(88%_0.11_105/0.08)_0%,transparent_72%)] blur-2xl"
        aria-hidden
      />
      <div className="relative rounded-[1.35rem] border border-white/6 bg-[oklch(13%_0.012_110/0.55)] p-2 sm:p-2.5 md:backdrop-blur-sm">
        <HeroMatchDemo lite={lite} />
      </div>
    </div>
  );
}

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
  return (
    <div className="flex flex-col gap-3 p-5">
      <motion.div
        initial={lite ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={lite ? { duration: 0 } : { duration: 0.35, ease: EASE }}
        className="self-start max-w-[90%] rounded-xl border border-[oklch(88%_0.11_105/0.25)] bg-[oklch(88%_0.11_105/0.08)] px-3 py-2"
      >
        <div className="flex items-start gap-2">
          <div className="mt-0.5 size-4 rounded-md bg-[oklch(88%_0.11_105/0.18)] flex items-center justify-center shrink-0">
            <Lightbulb className="size-2.5 text-[oklch(88%_0.11_105)]" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[oklch(88%_0.11_105)] uppercase tracking-wide">
              Conversation cue · Coming soon
            </p>
            <p className="text-[10px] text-white/70 leading-relaxed">
              Your new match likes chess and music. Use an icebreaker suggestion, then invite them to Watch Together.
            </p>
          </div>
        </div>
      </motion.div>
      <div className="self-end max-w-[78%]">
        <div className="bg-[oklch(88%_0.11_105)] text-[oklch(12%_0.012_110)] text-xs font-medium px-3.5 py-2.5 rounded-2xl rounded-br-sm">
          Hey! Just matched with you 👋
        </div>
      </div>
      <div className="self-start max-w-[78%]">
        <div className="bg-white/6 border border-white/8 text-white/80 text-xs px-3.5 py-2.5 rounded-2xl rounded-bl-sm">
          Hey! Saw you&apos;re into chess too. Do you play blitz?
        </div>
      </div>
      <div className="self-end max-w-[78%]">
        <div className="bg-[oklch(88%_0.11_105)] text-[oklch(12%_0.012_110)] text-xs font-medium px-3.5 py-2.5 rounded-2xl rounded-br-sm">
          Always 🔥 want to play a round?
        </div>
      </div>
      {/* typing indicator */}
      <div className="self-start flex items-center gap-1.5 bg-white/6 border border-white/8 px-3.5 py-2.5 rounded-2xl rounded-bl-sm w-fit">
        {lite
          ? [0, 1, 2].map((k) => <div key={k} className="size-1.5 rounded-full bg-white/50" />)
          : [0, 0.15, 0.3].map((d) => (
              <motion.div key={d} className="size-1.5 rounded-full bg-white/50" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: d }} />
            ))}
      </div>
      {/* input */}
      <div className="mt-1 flex items-center gap-2 rounded-xl bg-white/5 border border-white/8 px-3 py-2.5">
        <p className="text-[11px] text-white/25 flex-1">Type a message…</p>
        <div className="size-6 rounded-lg bg-[oklch(88%_0.11_105/0.15)] flex items-center justify-center">
          <Send className="size-3 text-[oklch(88%_0.11_105/0.7)]" />
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
      <div className="relative rounded-2xl bg-[oklch(20%_0.015_110)] border border-white/8 overflow-hidden aspect-video flex items-center justify-center">
        <div className="absolute inset-0 bg-linear-to-br from-violet-900/30 to-slate-900/60" />
        <div className="relative flex flex-col items-center gap-2">
          <div className="size-12 rounded-full bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center text-base font-bold text-white">M</div>
          <p className="text-xs text-white/60">Maya L. · connected</p>
        </div>
        {/* local pip */}
        <div className="absolute bottom-2 right-2 w-16 h-20 rounded-xl bg-linear-to-br from-amber-800/40 to-slate-800/60 border border-white/10 flex items-center justify-center">
          <div className="size-8 rounded-full bg-linear-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-xs font-bold text-white">Y</div>
        </div>
        {/* live badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/50 md:backdrop-blur-sm rounded-full px-2 py-0.5">
          {lite ? (
            <div className="size-1.5 rounded-full bg-red-500" />
          ) : (
            <motion.div className="size-1.5 rounded-full bg-red-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
          )}
          <span className="text-[10px] text-white/80 font-medium">LIVE</span>
        </div>
      </div>
      {/* controls */}
      <div className="flex justify-center gap-3">
        {[
          { icon: MicOff,  bg: "bg-white/8 border border-white/10",                         color: "text-white/70" },
          { icon: Video,   bg: "bg-white/8 border border-white/10",                         color: "text-white/70" },
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
              <motion.div key={i} className="absolute inset-0 rounded-full border border-[oklch(88%_0.11_105/0.3)]" animate={{ scale: [1, 1.6 + i * 0.2], opacity: [0.5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: d }} />
            ))}
        <div className="relative size-20 rounded-full bg-linear-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-amber-500/20">
          N
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-white">Noah K.</p>
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
            <div key={i} className="w-1 rounded-full bg-[oklch(88%_0.11_105/0.6)]" style={{ height: bar.height }} />
          ) : (
            <motion.div key={i} className="w-1 rounded-full bg-[oklch(88%_0.11_105/0.6)]" animate={{ height: [4, bar.height, 4] }} transition={{ duration: bar.duration, repeat: Infinity, ease: "easeInOut", delay: i * 0.06 }} />
          ),
        )}
      </div>
      {/* controls */}
      <div className="flex justify-center gap-3 mt-1">
        {[
          { icon: MicOff,   bg: "bg-white/8 border border-white/10", color: "text-white/60" },
          { icon: PhoneOff, bg: "bg-red-500/90",                     color: "text-white"    },
          { icon: Volume2,  bg: "bg-white/8 border border-white/10", color: "text-white/60" },
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
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[oklch(88%_0.11_105/0.06)] blur-[72px]" />
        <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full bg-[oklch(65%_0.15_280/0.07)] blur-[64px]" />
        <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full bg-[oklch(88%_0.11_105/0.05)] blur-[64px]" />
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <motion.div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[oklch(88%_0.11_105/0.05)] blur-[120px]" animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full bg-[oklch(65%_0.15_280/0.06)] blur-[100px]" animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }} />
      <motion.div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full bg-[oklch(88%_0.11_105/0.04)] blur-[100px]" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }} />
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
function LandingPageInner() {
  const { lite } = useLandingPerf();
  const [activeTab, setActiveTab] = useState<CommTab>("chat");
  const { data: session } = useSession();

  const sessionUser = session?.user as
    | { displayName?: string | null; name?: string | null; email?: string | null }
    | undefined;
  const displayName =
    sessionUser?.displayName?.trim() ||
    sessionUser?.name?.trim() ||
    "";
  const firstNameFromDisplay = displayName.split(/\s+/).filter(Boolean)[0] ?? "";
  const firstNameFromEmail = sessionUser?.email?.split("@")[0]?.trim() ?? "";
  const firstName = firstNameFromDisplay || firstNameFromEmail;
  const isLoggedIn = Boolean(session?.user);

  return (
    <div className="relative min-h-screen bg-[oklch(12%_0.012_110)] text-white overflow-x-hidden">

      <AmbientBackdrop />

      <Navbar isLoggedIn={isLoggedIn} firstName={firstName} />

      {/* ══════════════════ HERO ══════════════════ */}
      <section className="relative min-h-[calc(100dvh-4rem)] flex flex-col justify-center pt-24 sm:pt-28 pb-16 sm:pb-24 px-4 sm:px-6">
        <HeroBackdrop />

        <div className="relative mx-auto w-full max-w-7xl grid lg:grid-cols-2 gap-12 sm:gap-14 lg:gap-12 xl:gap-20 lg:items-center">

          <motion.div variants={stagger} initial="hidden" animate="show" className="text-center lg:text-left lg:max-w-[34rem]">

            <motion.div variants={fadeUp} className="mb-5 sm:mb-6 flex justify-center lg:justify-start">
              <Badge
                variant="outline"
                className="border-white/10 bg-white/3 text-white/55 rounded-full px-3.5 py-1 text-xs font-normal"
              >
                Beta · Free to join
              </Badge>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-[2.35rem] leading-[1.08] sm:text-[3.5rem] lg:text-[3.75rem] xl:text-[4.15rem] font-semibold tracking-[-0.025em] mb-5 sm:mb-6">
              Match your interests.
              <span className="mt-1.5 block text-white/92">
                Build your <span className="text-[oklch(88%_0.11_105)]">circles</span>.
              </span>
              <span className="mt-1.5 block text-[0.72em] font-normal text-white/48 sm:text-[0.68em]">Connect live.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-base sm:text-[1.05rem] text-white/46 leading-relaxed max-w-lg mx-auto lg:mx-0 mb-6 sm:mb-7">
              By profession, interests, or location — nearby or anywhere in the world.
            </motion.p>

            <motion.div variants={fadeUp} className="mb-8 sm:mb-9 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2.5">
              {HERO_SIGNALS.map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-2 text-sm text-white/38">
                  <Icon className="size-3.5 text-[oklch(88%_0.11_105/0.65)]" strokeWidth={1.75} />
                  {label}
                </span>
              ))}
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center lg:justify-start">
              <Button
                size="lg"
                className="rounded-xl bg-[oklch(88%_0.11_105)] text-[oklch(12%_0.012_110)] hover:brightness-110 font-semibold px-6 h-11 w-full sm:w-auto shadow-[0_8px_28px_-8px_oklch(88%_0.11_105/0.55)]"
                asChild
              >
                <Link href={isLoggedIn ? "/home" : "/register"}>
                  {isLoggedIn ? `Welcome${firstName ? `, ${firstName}` : ""}` : "Find your people"} <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl border-white/10 bg-white/3 text-white/78 hover:bg-white/6 hover:text-white px-6 h-11 w-full sm:w-auto"
                asChild
              >
                <Link href="#how-it-works">How it works</Link>
              </Button>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-8 sm:mt-9 pt-6 sm:pt-7 border-t border-white/6">
              <p className="text-xs text-white/32 max-w-md mx-auto lg:mx-0 leading-relaxed">
                {EARLY_RELEASE.noticeShort}
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            className="flex justify-center lg:justify-end order-first lg:order-last lg:py-4"
            initial={lite ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.15, ease: EASE }}
          >
            <HeroVisual />
          </motion.div>
        </div>
      </section>

      {/* ══════════════════ BETA HIGHLIGHTS ══════════════════ */}
      <RevealSection className="mx-4 sm:mx-6 lg:mx-auto max-w-7xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5 rounded-3xl overflow-hidden border border-white/8">
          {BETA_HIGHLIGHTS.map((s) => (
            <motion.div key={s.label} variants={cardIn} className="bg-[oklch(15%_0.015_110)] px-8 py-7 flex flex-col items-center gap-1">
              <span className="text-3xl font-black bg-linear-to-r from-[oklch(88%_0.11_105)] to-[oklch(95%_0.08_90)] bg-clip-text text-transparent">{s.value}</span>
              <span className="text-xs text-white/45 font-medium tracking-wide uppercase">{s.label}</span>
            </motion.div>
          ))}
        </div>
      </RevealSection>

      {/* ══════════════════ FEATURES ══════════════════ */}
      <section className="relative py-24 sm:py-32 px-4 sm:px-6" id="features">
        <RevealSection className="mx-auto max-w-7xl">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <Badge variant="outline" className="border-[oklch(88%_0.11_105/0.3)] bg-[oklch(88%_0.11_105/0.08)] text-[oklch(88%_0.11_105/0.8)] rounded-full mb-5 tracking-widest uppercase text-[10px]">
              Everything you need
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">Built for real connection</h2>
            <p className="mt-4 text-white/50 max-w-lg mx-auto">Every feature exists for one reason: to help you meet people who feel like people, not profiles.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon: Icon, label, desc, tint, iconClass }) => (
              <motion.div key={label} variants={cardIn} whileHover={lite ? undefined : { y: -6, transition: { duration: 0.25 } }}>
                <Card className="relative overflow-hidden border-white/8 bg-[oklch(16%_0.013_110)] h-full shadow-xl p-0 gap-0">
                  <div className={`absolute inset-0 bg-linear-to-br ${tint} opacity-60 pointer-events-none`} />
                  <CardContent className="relative p-6 flex flex-col gap-4">
                    <div className={cn("size-11 rounded-2xl border flex items-center justify-center", iconClass)}>
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="font-bold text-base text-white mb-1.5">{label}</p>
                      <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </RevealSection>
      </section>

      {/* ══════════════════ MATCHING CONTROL ══════════════════ */}
      <section className="relative py-24 px-6 bg-[oklch(13%_0.013_110)]">
        <RevealSection className="mx-auto max-w-7xl">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <Badge variant="outline" className="border-[oklch(88%_0.11_105/0.3)] bg-[oklch(88%_0.11_105/0.08)] text-[oklch(88%_0.11_105/0.8)] rounded-full mb-5 tracking-widest uppercase text-[10px]">
              Match exactly how you want
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">Find your people with real control</h2>
            <p className="mt-4 text-white/50 max-w-2xl mx-auto">
              Filter your connections your way and discover people instantly, whether you want nearby friends,
              city-level networking, country-wide communities, or global circles.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {MATCHING_SIGNALS.map(({ icon: Icon, title, desc }) => (
              <motion.div key={title} variants={cardIn}>
                <Card className="border-white/8 bg-[oklch(16%_0.013_110)] h-full shadow-xl p-0 gap-0">
                  <CardContent className="p-6 flex flex-col gap-4">
                    <div className="size-10 rounded-xl bg-[oklch(88%_0.11_105/0.1)] border border-[oklch(88%_0.11_105/0.2)] flex items-center justify-center">
                      <Icon className="size-4 text-[oklch(88%_0.11_105)]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white mb-1.5">{title}</p>
                      <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </RevealSection>
      </section>

      {/* ══════════════════ SAFETY BANNER ══════════════════ */}
      <RevealSection className="mx-4 sm:mx-6 lg:mx-auto max-w-7xl py-6">
        <motion.div
          variants={fadeIn}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6 rounded-2xl border border-white/8 bg-[oklch(16%_0.013_110)] px-4 sm:px-7 py-5"
        >
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="size-10 rounded-xl bg-[oklch(88%_0.11_105/0.1)] border border-[oklch(88%_0.11_105/0.2)] flex items-center justify-center shrink-0">
              <ShieldCheck className="size-5 text-[oklch(88%_0.11_105)]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">A space you can actually feel comfortable in</p>
              <p className="text-xs text-white/45 mt-0.5 max-w-lg">
                Greetup is moderated, NSFW-free, and built for genuine connection. Every interaction is covered by community guidelines that keep things respectful.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 w-full sm:w-auto">
            {[
              { icon: ShieldCheck, label: "Content moderated" },
              { icon: Users,       label: "No anonymous abuse" },
              { icon: Shield,      label: "Strict guidelines"  },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-white/40">
                <Icon className="size-3.5 text-[oklch(88%_0.11_105/0.6)]" />
                {label}
              </div>
            ))}
          </div>
        </motion.div>
      </RevealSection>

      {/* ══════════════════ CONNECT INSTANTLY (Chat / Video / Voice) ══════════════════ */}
      <section className="relative py-20 sm:py-28 px-4 sm:px-6 bg-[oklch(13%_0.013_110)] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-end pr-0">
          <div className="w-[400px] h-[400px] rounded-full bg-[oklch(88%_0.11_105/0.05)] blur-[48px] md:blur-[100px]" />
        </div>

        <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-16 items-center">
          {/* copy */}
          <RevealSection>
            <motion.div variants={fadeUp} className="mb-5">
              <Badge variant="outline" className="border-[oklch(88%_0.11_105/0.3)] bg-[oklch(88%_0.11_105/0.08)] text-[oklch(88%_0.11_105/0.8)] rounded-full tracking-widest uppercase text-[10px]">
                Real-time networking
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-5">
              Chat. Call. Video.<br />
              <span className="bg-linear-to-r from-[oklch(88%_0.11_105)] via-[oklch(95%_0.08_90)] to-[oklch(80%_0.14_110)] bg-clip-text text-transparent">
                Right when you match.
              </span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/55 leading-relaxed max-w-md mb-10">
              Once you match, move instantly between text, voice, and video. Start 1:1, bring in your friends,
              or continue inside a public or private circle without losing momentum.
            </motion.p>
            <motion.div variants={stagger} className="flex flex-col gap-4">
              {[
                { icon: MessageCircle, color: "text-sky-400 bg-sky-400/10 border-sky-400/20", title: "Instant chat", desc: "Real-time messaging with conversation cues tailored to your new match. Cues coming soon." },
                { icon: Phone, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", title: "Voice calls", desc: "Jump into audio to network quickly with people who share your niche." },
                { icon: Video, color: "text-violet-400 bg-violet-400/10 border-violet-400/20", title: "Video calls", desc: "Use face-to-face calls for stronger chemistry and deeper conversations." },
              ].map(({ icon: Icon, color, title, desc }) => (
                <motion.div key={title} variants={cardIn} className="flex items-start gap-4">
                  <div className={cn("size-10 rounded-xl border flex items-center justify-center shrink-0", color)}>
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </RevealSection>

          {/* interactive tab mockup */}
          <RevealSection className="flex justify-center lg:justify-end">
            <motion.div variants={fadeUp} className="relative w-full max-w-xs sm:max-w-sm">
              <Card className="border-white/10 bg-[oklch(17%_0.015_110)] overflow-hidden shadow-2xl shadow-black/50 p-0 gap-0">
                {/* header */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/6">
                  <div className="size-8 rounded-full bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">S</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white leading-none">Sofia L.</p>
                    <p className="text-[10px] text-white/40 mt-0.5">Just matched · Software Engineering · Music</p>
                  </div>
                  <div className="size-2 rounded-full bg-emerald-400" />
                </div>

                {/* tab switcher */}
                <div className="flex border-b border-white/6">
                  {COMM_TABS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-semibold transition-all",
                        activeTab === id
                          ? "text-[oklch(88%_0.11_105)] border-b-2 border-[oklch(88%_0.11_105)] bg-[oklch(88%_0.11_105/0.05)]"
                          : "text-white/35 hover:text-white/55 border-b-2 border-transparent"
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

              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-10 bg-[oklch(88%_0.11_105/0.1)] blur-lg md:blur-2xl rounded-full" />
            </motion.div>
          </RevealSection>
        </div>
      </section>

      {/* ══════════════════ CIRCLES IN ACTION ══════════════════ */}
      <section className="relative py-20 sm:py-28 px-4 sm:px-6 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-start pl-0">
          <div className="w-[400px] h-[400px] rounded-full bg-[oklch(65%_0.15_280/0.05)] blur-[48px] md:blur-[100px]" />
        </div>

        <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-16 items-center">
          {/* visual first on mobile, second on desktop */}
          <RevealSection className="flex justify-center lg:order-2">
            <motion.div variants={fadeUp} className="relative w-full max-w-xs sm:max-w-sm">
              <Card className="border-white/10 bg-[oklch(17%_0.015_110)] overflow-hidden shadow-2xl shadow-black/40 p-0 gap-0">
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/6">
                  <div className="size-8 rounded-full bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">L</div>
                  <div>
                    <p className="text-xs font-semibold text-white leading-none">Leo B.</p>
                    <p className="text-[10px] text-white/40 mt-0.5">Group room · Startup Founder Night Talk</p>
                  </div>
                  <div className="ml-auto size-2 rounded-full bg-emerald-400" />
                </div>
                <div className="px-4 py-4 flex flex-col gap-2.5 min-h-[130px]">
                  <div className="self-end bg-[oklch(88%_0.11_105)] text-[oklch(12%_0.012_110)] text-xs font-medium px-3 py-2 rounded-2xl rounded-br-sm max-w-[76%]">We are hosting a networking room now 👋</div>
                  <div className="self-start bg-white/6 border border-white/8 text-white/80 text-xs px-3 py-2 rounded-2xl rounded-bl-sm max-w-[76%]">Nice, invite me. I can bring one friend too.</div>
                </div>
                <Separator className="bg-white/6" />
                <div className="px-4 pb-3 pt-3">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <div className="size-4 rounded-md bg-[oklch(88%_0.11_105/0.12)] flex items-center justify-center">
                      <Lightbulb className="size-2.5 text-[oklch(88%_0.11_105)]" />
                    </div>
                    <p className="text-[10px] text-[oklch(88%_0.11_105/0.7)] font-semibold tracking-wide uppercase">Group room examples</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {CIRCLE_ACTIVITY_CHIPS.map((chip, i) => {
                      const chipLabel = chip.comingSoon ? `${chip.label} · Soon` : chip.label;
                      const chipClass = cn(
                        "text-[10px] font-medium px-2.5 py-1 rounded-full border transition-all cursor-default",
                        chip.comingSoon
                          ? "border-white/10 bg-white/4 text-white/40"
                          : "border-[oklch(88%_0.11_105/0.25)] bg-[oklch(88%_0.11_105/0.07)] text-white/70 hover:border-[oklch(88%_0.11_105/0.5)] hover:text-white",
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
                <div className="mx-4 mb-4 flex items-center gap-2 rounded-xl bg-white/5 border border-white/8 px-3 py-2.5">
                  <p className="text-[11px] text-white/25 flex-1">Type a message…</p>
                  <div className="size-6 rounded-lg bg-[oklch(88%_0.11_105/0.15)] flex items-center justify-center"><Send className="size-3 text-[oklch(88%_0.11_105/0.6)]" /></div>
                </div>
              </Card>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-10 bg-[oklch(88%_0.11_105/0.1)] blur-lg md:blur-2xl rounded-full" />
            </motion.div>
          </RevealSection>

          {/* copy */}
          <RevealSection className="lg:order-1">
            <motion.div variants={fadeUp} className="mb-5">
              <Badge variant="outline" className="border-[oklch(88%_0.11_105/0.3)] bg-[oklch(88%_0.11_105/0.08)] text-[oklch(88%_0.11_105/0.8)] rounded-full tracking-widest uppercase text-[10px]">
                Circles that feel alive
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-6">
              Discuss your niche.<br />
              <span className="bg-linear-to-r from-[oklch(88%_0.11_105)] via-[oklch(95%_0.08_90)] to-[oklch(80%_0.14_110)] bg-clip-text text-transparent">Build your network in circles.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/55 leading-relaxed max-w-md mb-8">
              Circles are group rooms built around shared interests. Join rooms like Startup Founder Night Talk,
              Jam Session for Musicians, chess rooms, Watch Together, draw together, study together, debate rooms,
              truth or dare, music rooms, and live polls, then move to 1:1 when you click.
            </motion.p>
            <motion.div variants={stagger} className="flex flex-col gap-4">
              {[
                { icon: Users, text: "Public and private circles for open communities or close trusted groups" },
                { icon: MessageCircle, text: "Move from circle chat to 1:1 when you find someone you click with" },
                { icon: Lightbulb, text: "Get conversation cues about that person so starting a conversation feels effortless. Coming soon." },
                { icon: Wind, text: "Invite your friend into the conversation and grow your network naturally" },
              ].map(({ icon: Icon, text }) => (
                <motion.div key={text} variants={cardIn} className="flex items-start gap-3">
                  <div className="size-7 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="size-3.5 text-[oklch(88%_0.11_105/0.8)]" />
                  </div>
                  <p className="text-sm text-white/55 leading-relaxed">{text}</p>
                </motion.div>
              ))}
            </motion.div>
          </RevealSection>
        </div>
      </section>

      {/* ══════════════════ LIVE STREAMS ══════════════════ */}
      <section className="relative py-20 sm:py-24 px-4 sm:px-6 bg-[oklch(13%_0.013_110)]">
        <RevealSection className="mx-auto max-w-7xl">
          <motion.div variants={fadeUp} className="text-center mb-12">
            <Badge variant="outline" className="border-[oklch(88%_0.11_105/0.3)] bg-[oklch(88%_0.11_105/0.08)] text-[oklch(88%_0.11_105/0.85)] rounded-full mb-5 tracking-widest uppercase text-[10px]">
              Live with your connections
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">Go live from your matches and circles</h2>
            <p className="mt-4 text-white/50 max-w-2xl mx-auto">
              Turn any active match or circle conversation into a live session in one tap, then stream out to platforms like YouTube from the same flow. Coming soon.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3 mb-8">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-white/12 bg-white/6 text-white/60 px-5 cursor-default"
              disabled
            >
              Start live session · Coming soon
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-white/12 bg-white/6 text-white/80 hover:bg-white/10 hover:text-white px-5"
              asChild
            >
              <Link href={isLoggedIn ? "/home" : "/login"}>Open your connections</Link>
            </Button>
          </motion.div>
          <motion.p variants={fadeUp} className="text-center text-xs text-white/45 mb-6">
            Live room size stays intimate: up to 15 people per room, with multi-platform streaming to YouTube and more.
          </motion.p>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
            {LIVE_STREAM_EXAMPLES.map((stream) => (
              <motion.div key={stream.title} variants={cardIn}>
                <Card className="border-white/8 bg-[oklch(16%_0.013_110)] shadow-xl p-0 gap-0">
                  <CardContent className="p-6 flex flex-col gap-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-base font-bold text-white leading-tight">{stream.title}</p>
                        <p className="text-xs text-white/55 mt-1">{stream.topic}</p>
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/6 px-2 py-1 text-[10px] font-semibold text-white/55">
                        Example
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-8 rounded-full bg-[oklch(88%_0.11_105/0.18)] border border-[oklch(88%_0.11_105/0.26)] flex items-center justify-center text-xs font-bold text-[oklch(88%_0.11_105)] shrink-0">
                        {stream.category.slice(0, 1)}
                      </div>
                      <p className="text-[11px] text-white/45 truncate">{stream.category}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/55">
                        <Users className="size-3" />
                        Room idea
                      </div>
                      <Button size="sm" variant="outline" className="rounded-full border-white/12 bg-white/6 text-white/50 px-4 cursor-default" disabled>
                        Go live · Soon
                      </Button>
                    </div>
                    <p className="text-[10px] text-white/45">
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
      <section className="relative py-20 sm:py-24 px-4 sm:px-6 bg-[oklch(14%_0.013_110)]" id="how-it-works">
        <RevealSection className="mx-auto max-w-5xl">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <Badge variant="outline" className="border-[oklch(88%_0.11_105/0.3)] bg-[oklch(88%_0.11_105/0.08)] text-[oklch(88%_0.11_105/0.8)] rounded-full mb-5 tracking-widest uppercase text-[10px]">
              The process
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">Three steps to<br />finding your tribe</h2>
          </motion.div>

          <div className="relative grid md:grid-cols-3 gap-8">
            <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-px bg-linear-to-r from-transparent via-[oklch(88%_0.11_105/0.3)] to-transparent" />
            {STEPS.map((step, i) => (
              <motion.div key={step.n} variants={cardIn} className="relative flex flex-col items-center text-center gap-5">
                <div className="relative">
                  <div className="size-20 rounded-full border border-[oklch(88%_0.11_105/0.2)] bg-[oklch(17%_0.015_110)] flex items-center justify-center">
                    <span className="text-2xl font-black text-[oklch(88%_0.11_105)]">{step.n}</span>
                  </div>
                  {!lite && <StepRippleRings stepIndex={i} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </RevealSection>
      </section>

      {/* ══════════════════ TRUST ══════════════════ */}
      <div className="py-12 px-4 sm:px-6 border-y border-white/5 bg-[oklch(14%_0.013_110)]">
        <RevealSection className="mx-auto max-w-4xl flex flex-wrap items-center justify-center gap-x-12 gap-y-5">
          {TRUST.map(({ icon: Icon, label }) => (
            <motion.div key={label} variants={fadeIn} className="flex items-center gap-2 text-sm font-medium text-white/30">
              <Icon className="size-4 text-[oklch(88%_0.11_105/0.5)]" />
              {label}
            </motion.div>
          ))}
        </RevealSection>
      </div>

      {/* ══════════════════ FINAL CTA ══════════════════ */}
      <section className="relative py-24 sm:py-36 px-4 sm:px-6 overflow-hidden" id="join">
        {lite ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
            <div className="w-[min(100vw,700px)] h-[min(100vw,700px)] rounded-full bg-[oklch(88%_0.11_105/0.07)] blur-[64px] md:blur-[130px]" />
          </div>
        ) : (
          <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none" animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
            <div className="w-[700px] h-[700px] rounded-full bg-[oklch(88%_0.11_105/0.07)] blur-[130px]" />
          </motion.div>
        )}

        <RevealSection className="relative mx-auto max-w-3xl text-center">
          <motion.div variants={fadeUp} className="mb-8">
            <Badge variant="outline" className="border-white/12 bg-white/5 text-white/70 md:backdrop-blur-sm rounded-full px-4 py-1.5 text-xs gap-2">
              {EARLY_RELEASE.badge}
            </Badge>
          </motion.div>

          <motion.h2 variants={fadeUp} className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-tight mb-6">
            Your people.<br />
            <span className="bg-linear-to-r from-[oklch(88%_0.11_105)] via-[oklch(95%_0.08_90)] to-[oklch(80%_0.14_110)] bg-clip-text text-transparent">
              Your circles.
            </span>
          </motion.h2>

          <motion.p variants={fadeUp} className="text-lg text-white/50 mb-12 max-w-xl mx-auto">
            Join circles around what you care about, match with people who truly align, and connect in real time from
            nearby to global communities.
          </motion.p>

          <motion.div variants={fadeUp}>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="inline-block">
              <Button
                size="lg"
                className="rounded-full bg-[oklch(88%_0.11_105)] text-[oklch(12%_0.012_110)] hover:brightness-110 shadow-2xl shadow-[oklch(88%_0.11_105/0.35)] font-black text-base px-10 py-6"
                asChild
              >
                <Link href={isLoggedIn ? "/home" : "/register"}>
                  {isLoggedIn ? `Continue${firstName ? `, ${firstName}` : ""}` : "Join Greetup. It's free"} <ArrowRight className="size-5" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          <motion.p variants={fadeUp} className="mt-6 text-xs text-white/25">
            No credit card. No algorithm that sells you ads. Just people.
          </motion.p>
        </RevealSection>
      </section>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer className="border-t border-white/5 bg-[oklch(12%_0.01_110)] px-4 sm:px-6 py-12">
        <RevealSection className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <motion.div variants={fadeIn}><Logo /></motion.div>
          <motion.div variants={stagger} className="flex flex-wrap justify-center gap-x-1 gap-y-1">
            {["About","Privacy","Terms","Community Guidelines","Contact"].map((link) => (
              <motion.div key={link} variants={fadeIn}>
                <Button variant="ghost" size="sm" className="text-white/35 hover:text-white/60 hover:bg-white/5 text-xs rounded-full" asChild>
                  <a href="#">{link}</a>
                </Button>
              </motion.div>
            ))}
          </motion.div>
          <motion.p variants={fadeIn} className="text-xs text-white/25">© 2026 Greetup. All rights reserved.</motion.p>
        </RevealSection>
      </footer>
    </div>
  );
}

export function LandingPageView() {
  return (
    <LandingPerfProvider>
      <LandingPageInner />
    </LandingPerfProvider>
  );
}

export default function LandingRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return null;
}
