"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  motion,
  useScroll,
  useTransform,
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
  Gamepad2,
  MessageCircle,
  ArrowRight,
  Star,
  ChevronRight,
  Compass,
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
    label: "Activities Together",
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
  { n: "01", title: "Set your preferences",    desc: "Answer a few quick questions about your interests, goals, and the kind of connections you want." },
  { n: "02", title: "Get matched",      desc: "Our engine finds people with real alignment — not just the same city, but the same wavelength." },
  { n: "03", title: "Connect & grow", desc: "Chat, call, join activities, or hop into a circle together. Build real relationships naturally." },
];

const TESTIMONIALS = [
  { quote: "I found one of my closest friends on Greetup. We matched on shared interests and the conversation clicked from day one.", name: "Priya K.", tag: "Music Circle", avatar: "P", color: "from-violet-500 to-purple-600" },
  { quote: "I've tried every social app. Greetup is the first one where I felt like the people I met actually got me. The matching is genuinely uncanny.",           name: "Mateo R.", tag: "Philosophy Talks",  avatar: "M", color: "from-amber-500 to-yellow-600"  },
  { quote: "The Circles feature is incredible. I joined a creator community and now we host weekly sessions. Real community, not just followers.",               name: "Mei C.", tag: "Art Circle", avatar: "M", color: "from-emerald-500 to-green-600" },
];

const STATS = [
  { value: "24K+",   label: "Members"           },
  { value: "140K+",  label: "Connections made"  },
  { value: "4,200+", label: "Active Circles"    },
  { value: "98%",    label: "Positive matches"  },
];

const TRUST = [
  { icon: Shield,      label: "Privacy first"       },
  { icon: Globe,       label: "180+ countries"       },
  { icon: Zap,         label: "Real-time matching"  },
  { icon: Users,       label: "Verified members"    },
  { icon: ShieldCheck, label: "Safe & inclusive"    },
];

const LIVE_STREAMS = [
  {
    title: "Live Music Listening Room",
    host: "Liam O.",
    topic: "Share tracks and break down lyrics together",
    viewers: 12,
    category: "Music",
    platforms: ["YouTube", "Twitch"],
  },
  {
    title: "Open Sketch Studio",
    host: "Mei C.",
    topic: "Collaborative drawing and visual critiques",
    viewers: 14,
    category: "Art",
    platforms: ["YouTube", "Kick"],
  },
  {
    title: "Late Night Philosophy Room",
    host: "Diego P.",
    topic: "Meaning, ethics, and modern life discussions",
    viewers: 10,
    category: "Philosophy",
    platforms: ["YouTube", "X Live"],
  },
  {
    title: "Creative Writing Circle",
    host: "Sofia L.",
    topic: "Poetry prompts and short reading sessions",
    viewers: 15,
    category: "Writing",
    platforms: ["YouTube", "Twitch"],
  },
];

/* ─── Navbar ─────────────────────────────────────────────────────────────────── */
function Navbar({
  isLoggedIn,
  firstName,
}: {
  isLoggedIn: boolean;
  firstName: string;
}) {
  const { scrollY } = useScroll();
  const bg     = useTransform(scrollY, [0, 60], ["rgba(0,0,0,0)", "rgba(18,18,20,0.88)"]);
  const shadow = useTransform(scrollY, [0, 60], ["0 0 0 rgba(0,0,0,0)", "0 8px 32px rgba(0,0,0,0.28)"]);

  return (
    <motion.nav
      style={{ backgroundColor: bg, boxShadow: shadow }}
      className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl border-b border-white/4"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: EASE }}>
          <Logo />
        </motion.div>
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
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
            <Button
              size="sm"
              className="rounded-full bg-[oklch(88%_0.11_105)] text-[oklch(15%_0.02_110)] hover:brightness-110 shadow-lg shadow-[oklch(88%_0.11_105/0.3)] font-semibold"
              asChild
            >
              <Link href={isLoggedIn ? "/home" : "/register"}>
                {isLoggedIn ? "Go to home" : "Get started"} <ChevronRight className="size-3.5" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </motion.nav>
  );
}

/* ─── Hero orb components ────────────────────────────────────────────────────── */
function FloatingChip({ name, sub, color, letter, x, y, delay }: {
  name: string; sub: string; color: string; letter: string; x: string; y: string; delay: number;
}) {
  return (
    <motion.div
      className="absolute flex items-center gap-2 max-w-[42vw] sm:max-w-none bg-[oklch(17%_0.015_110/0.92)] backdrop-blur-sm border border-white/10 rounded-2xl px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-xl"
      style={{ left: x, top: y, translateX: "-50%", translateY: "-50%" }}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
      transition={{
        opacity: { delay, duration: 0.5 },
        scale:   { delay, duration: 0.5, ease: EASE },
        y:       { delay: delay + 0.5, duration: 3.5, repeat: Infinity, ease: "easeInOut" },
      }}
    >
      <div className={`size-6 sm:size-7 rounded-full bg-linear-to-br ${color} flex items-center justify-center text-[10px] sm:text-xs font-bold text-white shrink-0`}>{letter}</div>
      <div className="min-w-0">
        <p className="text-[11px] sm:text-xs font-semibold text-white leading-none truncate">{name}</p>
        <p className="text-[9px] sm:text-[10px] text-white/50 mt-0.5 leading-none truncate">{sub}</p>
      </div>
    </motion.div>
  );
}

function HeroOrb() {
  return (
    <div className="relative w-full max-w-[280px] sm:max-w-sm mx-auto aspect-square select-none pointer-events-none">
      <motion.div className="absolute inset-0 rounded-full border border-[oklch(88%_0.11_105/0.15)]" animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} />
      <motion.div className="absolute inset-[10%] rounded-full border border-dashed border-[oklch(88%_0.11_105/0.12)]" animate={{ rotate: -360 }} transition={{ duration: 14, repeat: Infinity, ease: "linear" }} />
      <motion.div className="absolute inset-[22%] rounded-full border border-[oklch(88%_0.11_105/0.18)]" animate={{ rotate: 360 }} transition={{ duration: 9, repeat: Infinity, ease: "linear" }} />
      <div className="absolute inset-[30%] rounded-full bg-[oklch(88%_0.11_105/0.07)] blur-2xl" />
      <div className="absolute inset-[38%] rounded-full bg-[oklch(88%_0.11_105/0.13)] blur-lg" />
      <motion.div className="absolute inset-[36%] rounded-full bg-linear-to-br from-[oklch(90%_0.13_105)] to-[oklch(75%_0.1_105)] shadow-2xl shadow-[oklch(88%_0.11_105/0.5)]" animate={{ scale: [0.93, 1.07, 0.93] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }} />
      <div className="absolute inset-[38%] rounded-full flex items-center justify-center z-10">
        <Compass className="size-5 text-[oklch(15%_0.02_110)]" />
      </div>
      {[0, 0.8, 1.6].map((delay, i) => (
        <motion.div key={i} className="absolute inset-[36%] rounded-full border border-[oklch(88%_0.11_105/0.35)]" animate={{ scale: [1, 1.9], opacity: [0.4, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay }} />
      ))}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {[{ x1: 18, y1: 20, x2: 50, y2: 50 }, { x1: 82, y1: 78, x2: 50, y2: 50 }, { x1: 14, y1: 56, x2: 50, y2: 50 }].map((l, i) => (
          <motion.line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="oklch(88% 0.11 105)" strokeWidth="0.4" strokeDasharray="3 2" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.3 }} transition={{ duration: 1.2, delay: 0.4 + i * 0.2, ease: "easeOut" }} />
        ))}
      </svg>
      <FloatingChip name="Aarav" sub="Software Engineer · Backend" color="from-violet-500 to-purple-600" letter="A" x="14%" y="20%" delay={0.6} />
      <FloatingChip name="Noah" sub="Software Engineer · Frontend" color="from-indigo-500 to-blue-600" letter="N" x="82%" y="22%" delay={0.75} />
      <FloatingChip name="Sofia" sub="Product Designer · UX" color="from-amber-500 to-yellow-600" letter="S" x="86%" y="78%" delay={0.9} />
      <FloatingChip name="Priya" sub="Music · Indie + Jazz" color="from-emerald-500 to-green-600" letter="P" x="14%" y="60%" delay={1.05} />
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
  return (
    <div className="flex flex-col gap-3 p-5">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="self-start max-w-[90%] rounded-xl border border-[oklch(88%_0.11_105/0.25)] bg-[oklch(88%_0.11_105/0.08)] px-3 py-2"
      >
        <div className="flex items-start gap-2">
          <div className="mt-0.5 size-4 rounded-md bg-[oklch(88%_0.11_105/0.18)] flex items-center justify-center shrink-0">
            <Lightbulb className="size-2.5 text-[oklch(88%_0.11_105)]" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[oklch(88%_0.11_105)] uppercase tracking-wide">Conversation cue</p>
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
          Hey! Saw you&apos;re into chess too — do you play blitz?
        </div>
      </div>
      <div className="self-end max-w-[78%]">
        <div className="bg-[oklch(88%_0.11_105)] text-[oklch(12%_0.012_110)] text-xs font-medium px-3.5 py-2.5 rounded-2xl rounded-br-sm">
          Always 🔥 want to play a round?
        </div>
      </div>
      {/* typing indicator */}
      <div className="self-start flex items-center gap-1.5 bg-white/6 border border-white/8 px-3.5 py-2.5 rounded-2xl rounded-bl-sm w-fit">
        {[0, 0.15, 0.3].map((d) => (
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
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
          <motion.div className="size-1.5 rounded-full bg-red-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
          <span className="text-[10px] text-white/80 font-medium">LIVE</span>
        </div>
      </div>
      {/* controls */}
      <div className="flex justify-center gap-3">
        {[
          { icon: MicOff,  bg: "bg-white/8 border border-white/10",                         color: "text-white/70" },
          { icon: Video,   bg: "bg-white/8 border border-white/10",                         color: "text-white/70" },
          { icon: PhoneOff,bg: "bg-red-500/90",                                              color: "text-white"    },
        ].map(({ icon: Icon, bg, color }, i) => (
          <motion.div key={i} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} className={cn("size-10 rounded-full flex items-center justify-center cursor-default", bg)}>
            <Icon className={cn("size-4", color)} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function VoiceMockup() {
  return (
    <div className="flex flex-col items-center gap-5 p-6 py-8">
      {/* avatar with pulse */}
      <div className="relative">
        {[0, 0.4, 0.8].map((d, i) => (
          <motion.div key={i} className="absolute inset-0 rounded-full border border-[oklch(88%_0.11_105/0.3)]" animate={{ scale: [1, 1.6 + i * 0.2], opacity: [0.5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: d }} />
        ))}
        <div className="relative size-20 rounded-full bg-linear-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-amber-500/20">
          N
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-white">Noah K.</p>
        <div className="flex items-center gap-1.5 justify-center mt-1">
          <motion.div className="size-1.5 rounded-full bg-emerald-400" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
          <p className="text-[11px] text-emerald-400">Voice call · 2:34</p>
        </div>
      </div>
      {/* voice wave */}
      <div className="flex items-center gap-1">
        {WAVE_BARS.map((bar, i) => (
          <motion.div key={i} className="w-1 rounded-full bg-[oklch(88%_0.11_105/0.6)]" animate={{ height: [4, bar.height, 4] }} transition={{ duration: bar.duration, repeat: Infinity, ease: "easeInOut", delay: i * 0.06 }} />
        ))}
      </div>
      {/* controls */}
      <div className="flex justify-center gap-3 mt-1">
        {[
          { icon: MicOff,   bg: "bg-white/8 border border-white/10", color: "text-white/60" },
          { icon: PhoneOff, bg: "bg-red-500/90",                     color: "text-white"    },
          { icon: Volume2,  bg: "bg-white/8 border border-white/10", color: "text-white/60" },
        ].map(({ icon: Icon, bg, color }, i) => (
          <motion.div key={i} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} className={cn("size-10 rounded-full flex items-center justify-center cursor-default", bg)}>
            <Icon className={cn("size-4", color)} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export function LandingPageView() {
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

      {/* ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[oklch(88%_0.11_105/0.05)] blur-[120px]" animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full bg-[oklch(65%_0.15_280/0.06)] blur-[100px]" animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }} />
        <motion.div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full bg-[oklch(88%_0.11_105/0.04)] blur-[100px]" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }} />
      </div>

      <Navbar isLoggedIn={isLoggedIn} firstName={firstName} />

      {/* ══════════════════ HERO ══════════════════ */}
      <section className="relative pt-28 sm:pt-32 pb-20 sm:pb-24 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-16 items-center">

          <motion.div variants={stagger} initial="hidden" animate="show">
            {/* beta badge using shadcn Badge */}
            <motion.div variants={fadeUp} className="mb-8">
              <Badge
                variant="outline"
                className="border-white/12 bg-white/5 text-white/75 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs gap-2"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <motion.span className="absolute inline-flex h-full w-full rounded-full bg-[oklch(88%_0.11_105)]" animate={{ scale: [1, 2.2, 1], opacity: [0.7, 0, 0.7] }} transition={{ duration: 2, repeat: Infinity }} />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[oklch(88%_0.11_105)]" />
                </span>
                Now in Beta · Free to join
              </Badge>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6">
              Match your vibe.<br />
              <span className="bg-linear-to-r from-[oklch(88%_0.11_105)] via-[oklch(95%_0.08_90)] to-[oklch(80%_0.14_110)] bg-clip-text text-transparent">
                Build your circles.
              </span>
              <br />Connect live.
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg text-white/55 leading-relaxed max-w-md mb-10">
              Greetup helps you connect with the exact kind of people you want by profession, interests, and location
              (nearby, city, country, or global). Smart conversation cues help with what to say about your new match, so
              every 1:1 chat or circle starts smoothly.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                <Button
                  size="lg"
                  className="rounded-full bg-[oklch(88%_0.11_105)] text-[oklch(12%_0.012_110)] hover:brightness-110 shadow-xl shadow-[oklch(88%_0.11_105/0.3)] font-bold px-7"
                  asChild
                >
                  <Link href={isLoggedIn ? "/home" : "/register"}>
                    {isLoggedIn ? `Welcome${firstName ? `, ${firstName}` : ""}` : "Find your people"} <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/12 bg-white/6 text-white/80 hover:bg-white/10 hover:text-white backdrop-blur-sm px-7"
                  asChild
                >
                  <Link href="#how-it-works">See how it works</Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* social proof */}
            <motion.div variants={fadeUp} className="mt-10 flex items-center gap-3">
              <div className="flex -space-x-2">
                {(["#7c3aed","#d97706","#059669","#2563eb","#db2777"] as const).map((c, i) => (
                  <motion.div key={i} className="size-8 rounded-full border-2 border-[oklch(12%_0.012_110)] flex items-center justify-center text-[10px] font-bold text-white" style={{ background: c }} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.07, duration: 0.4 }}>
                    {["N","M","L","S","D"][i]}
                  </motion.div>
                ))}
              </div>
              <p className="text-xs text-white/50">
                <span className="text-white/80 font-semibold">2,400+</span> people joined this week
              </p>
            </motion.div>
          </motion.div>

          <motion.div className="flex justify-center lg:justify-end" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.2, ease: EASE }}>
            <HeroOrb />
          </motion.div>
        </div>
      </section>

      {/* ══════════════════ STATS ══════════════════ */}
      <RevealSection className="mx-4 sm:mx-6 lg:mx-auto max-w-7xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5 rounded-3xl overflow-hidden border border-white/8">
          {STATS.map((s) => (
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
            <p className="mt-4 text-white/50 max-w-lg mx-auto">Every feature exists for one reason — to help you meet people who feel like people, not profiles.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon: Icon, label, desc, tint, iconClass }) => (
              <motion.div key={label} variants={cardIn} whileHover={{ y: -6, transition: { duration: 0.25 } }}>
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
          <div className="w-[400px] h-[400px] rounded-full bg-[oklch(88%_0.11_105/0.05)] blur-[100px]" />
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
                { icon: MessageCircle, color: "text-sky-400 bg-sky-400/10 border-sky-400/20", title: "Instant chat", desc: "Real-time messaging with conversation cues tailored to your new match." },
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

              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-10 bg-[oklch(88%_0.11_105/0.1)] blur-2xl rounded-full" />
            </motion.div>
          </RevealSection>
        </div>
      </section>

      {/* ══════════════════ CIRCLES IN ACTION ══════════════════ */}
      <section className="relative py-20 sm:py-28 px-4 sm:px-6 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-start pl-0">
          <div className="w-[400px] h-[400px] rounded-full bg-[oklch(65%_0.15_280/0.05)] blur-[100px]" />
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
                    {[
                      "Startup Founder Night Talk",
                      "Jam Session for Musicians",
                      "Chess Blitz Room",
                      "Watch Together (YouTube)",
                      "Icebreaker Suggestions",
                      "Draw Together",
                      "Study Together",
                      "Debate Room",
                      "Truth or Dare",
                      "Music Room",
                      "Live Polls",
                    ].map((chip, i) => (
                      <motion.button key={chip} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.12, duration: 0.35, ease: EASE }}
                        className="text-[10px] font-medium px-2.5 py-1 rounded-full border border-[oklch(88%_0.11_105/0.25)] bg-[oklch(88%_0.11_105/0.07)] text-white/70 hover:border-[oklch(88%_0.11_105/0.5)] hover:text-white transition-all cursor-default"
                      >
                        {chip}
                      </motion.button>
                    ))}
                  </div>
                </div>
                <div className="mx-4 mb-4 flex items-center gap-2 rounded-xl bg-white/5 border border-white/8 px-3 py-2.5">
                  <p className="text-[11px] text-white/25 flex-1">Type a message…</p>
                  <div className="size-6 rounded-lg bg-[oklch(88%_0.11_105/0.15)] flex items-center justify-center"><Send className="size-3 text-[oklch(88%_0.11_105/0.6)]" /></div>
                </div>
              </Card>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-10 bg-[oklch(88%_0.11_105/0.1)] blur-2xl rounded-full" />
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
                { icon: Lightbulb, text: "Get conversation cues about that person so starting a conversation feels effortless" },
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
              Turn any active match or circle conversation into a live session in one tap, then stream out to platforms like YouTube from the same flow.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3 mb-8">
            <Button
              size="sm"
              className="rounded-full bg-[oklch(88%_0.11_105)] text-[oklch(15%_0.02_110)] hover:brightness-110 font-semibold px-5"
              asChild
            >
              <Link href={isLoggedIn ? "/home" : "/login"}>
                Start live session <Video className="size-3.5" />
              </Link>
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
            {LIVE_STREAMS.map((stream) => (
              <motion.div key={stream.title} variants={cardIn}>
                <Card className="border-white/8 bg-[oklch(16%_0.013_110)] shadow-xl p-0 gap-0">
                  <CardContent className="p-6 flex flex-col gap-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-base font-bold text-white leading-tight">{stream.title}</p>
                        <p className="text-xs text-white/55 mt-1">{stream.topic}</p>
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/12 px-2 py-1 text-[10px] font-semibold text-red-300">
                        <motion.span
                          className="size-1.5 rounded-full bg-red-400"
                          animate={{ opacity: [1, 0.35, 1] }}
                          transition={{ duration: 1.3, repeat: Infinity }}
                        />
                        LIVE
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-8 rounded-full bg-[oklch(88%_0.11_105/0.18)] border border-[oklch(88%_0.11_105/0.26)] flex items-center justify-center text-xs font-bold text-[oklch(88%_0.11_105)] shrink-0">
                          {stream.host.slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-white/80 truncate">{stream.host}</p>
                          <p className="text-[11px] text-white/45 truncate">{stream.category}</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-white/45 shrink-0">{stream.viewers} in room</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-white/55">
                        <Users className="size-3" />
                        Connected room
                      </div>
                      <Button size="sm" className="rounded-full bg-[oklch(88%_0.11_105)] text-[oklch(15%_0.02_110)] hover:brightness-110 font-semibold px-4" asChild>
                        <Link href={isLoggedIn ? "/home" : "/login"}>Go live</Link>
                      </Button>
                    </div>
                    <p className="text-[10px] text-white/45">
                      Stream to: {stream.platforms.join(" · ")}
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
                  {[0, 0.7, 1.4].map((d, ri) => (
                    <motion.div key={ri} className="absolute inset-0 rounded-full border border-[oklch(88%_0.11_105/0.3)]" animate={{ scale: [1, 1.8], opacity: [0.4, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay: i * 0.4 + d }} />
                  ))}
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

      {/* ══════════════════ TESTIMONIALS ══════════════════ */}
      <section className="py-24 sm:py-32 px-4 sm:px-6" id="community">
        <RevealSection className="mx-auto max-w-7xl">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <Badge variant="outline" className="border-[oklch(88%_0.11_105/0.3)] bg-[oklch(88%_0.11_105/0.08)] text-[oklch(88%_0.11_105/0.8)] rounded-full mb-5 tracking-widest uppercase text-[10px]">
              From the community
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">Real people. Real stories.</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <motion.div key={t.name} variants={cardIn} whileHover={{ y: -5, transition: { duration: 0.22 } }}>
                <Card className="border-white/8 bg-[oklch(16%_0.013_110)] h-full shadow-xl p-0 gap-0">
                  <CardContent className="p-7 flex flex-col gap-5 h-full">
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, si) => (
                        <Star key={si} className="size-3.5 fill-[oklch(88%_0.11_105)] text-[oklch(88%_0.11_105)]" />
                      ))}
                    </div>
                    <p className="text-sm text-white/65 leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                    <div className="flex items-center gap-3 pt-2 border-t border-white/6">
                      <div className={`size-9 rounded-full bg-linear-to-br ${t.color} flex items-center justify-center text-sm font-bold text-white`}>{t.avatar}</div>
                      <div>
                        <p className="text-sm font-semibold text-white">{t.name}</p>
                        <p className="text-xs text-white/40">{t.tag}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
        <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none" animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
          <div className="w-[700px] h-[700px] rounded-full bg-[oklch(88%_0.11_105/0.07)] blur-[130px]" />
        </motion.div>

        <RevealSection className="relative mx-auto max-w-3xl text-center">
          <motion.div variants={fadeUp} className="mb-8">
            <Badge variant="outline" className="border-white/12 bg-white/5 text-white/70 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs gap-2">
              <MapPin className="size-3 text-[oklch(88%_0.11_105)]" />
              Your people are already here
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
                  {isLoggedIn ? `Continue${firstName ? `, ${firstName}` : ""}` : "Join Greetup — it&apos;s free"} <ArrowRight className="size-5" />
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
          <motion.p variants={fadeIn} className="text-xs text-white/25">© 2025 Greetup. All rights reserved.</motion.p>
        </RevealSection>
      </footer>
    </div>
  );
}

export default function LandingRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return null;
}
