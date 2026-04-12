import { Search, Users, Zap, Music, Code, Palette, Globe, Coffee, Dumbbell } from "lucide-react";

export const VIBES = [
  { icon: Code, label: "Tech & AI", count: 312, color: "from-violet-500 to-indigo-600" },
  { icon: Palette, label: "Design", count: 187, color: "from-pink-500 to-rose-600" },
  { icon: Music, label: "Music", count: 243, color: "from-sky-500 to-blue-600" },
  { icon: Globe, label: "Travel", count: 156, color: "from-emerald-500 to-teal-600" },
  { icon: Coffee, label: "Startups", count: 98, color: "from-amber-500 to-orange-600" },
  { icon: Dumbbell, label: "Fitness", count: 134, color: "from-red-500 to-rose-700" },
] as const;

export const PEOPLE = [
  { name: "Mia C.", tagline: "UI designer · Music lover", initials: "MC", grad: "from-pink-400 to-rose-600", vibeScore: 96, online: true },
  { name: "Rohan V.", tagline: "Full-stack dev · Founder", initials: "RV", grad: "from-violet-400 to-indigo-600", vibeScore: 91, online: true },
  { name: "Layla S.", tagline: "Product manager · Traveller", initials: "LS", grad: "from-sky-400 to-blue-600", vibeScore: 88, online: false },
  { name: "Dev P.", tagline: "Creative director · Writer", initials: "DP", grad: "from-amber-400 to-orange-600", vibeScore: 85, online: true },
  { name: "Isha T.", tagline: "Data scientist · Musician", initials: "IT", grad: "from-emerald-400 to-teal-600", vibeScore: 82, online: false },
  { name: "Karan M.", tagline: "Indie hacker · Coffee nerd", initials: "KM", grad: "from-red-400 to-rose-600", vibeScore: 79, online: true },
] as const;
